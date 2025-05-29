import { days, seconds, toSeconds } from '@awsless/duration'
import { $, Input, Group } from '@awsless/formation'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'
import { getCacheControl, getContentType, getForwardHostFunctionCode } from './util.js'
import { camelCase, constantCase } from 'change-case'
import { generateCacheKey } from '../../util/cache.js'
import { directories } from '../../util/path.js'
import { execCommand } from '../../util/exec.js'
import { Invalidation } from '../../formation/cloudfront.js'
import { createHash } from 'crypto'
import { Future } from '@awsless/formation'

export const siteFeature = defineFeature({
	name: 'site',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.sites ?? {})) {
			const group = new Group(ctx.stack, 'site', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'site',
				resourceName: id,
			})

			if (props.build) {
				const buildProps = props.build
				ctx.registerBuild('site', name, async build => {
					const fingerprint = await generateCacheKey(buildProps.cacheKey)

					return build(fingerprint, async write => {
						const cwd = join(directories.root, dirname(ctx.stackConfig.file))

						await execCommand({
							cwd,
							command: buildProps.command,
						})

						await write('HASH', fingerprint)

						return {
							size: 'n/a',
						}
					})
				})
			}

			const origins: $.aws.cloudfront.DistributionInput['origin'] = []
			const originGroups: $.aws.cloudfront.DistributionInput['originGroup'] = []

			let bucket: $.aws.s3.Bucket
			const versions: Array<Input<string> | Input<string | undefined>> = []

			if (props.ssr) {
				const result = createLambdaFunction(group, ctx, `site`, id, props.ssr)

				versions.push(result.code.sourceHash)

				// if ('versionId' in result.code) {
				// }

				ctx.onBind((name, value) => {
					result.setEnvironment(name, value)
				})

				new $.aws.lambda.Permission(group, 'ssr-permission', {
					principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunctionUrl',
					functionName: result.lambda.functionName,
					functionUrlAuthType: 'AWS_IAM',
					sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
				})

				const url = new $.aws.lambda.FunctionUrl(group, 'url', {
					functionName: result.lambda.functionName,
					authorizationType: 'AWS_IAM',
				})

				const ssrAccessControl = new $.aws.cloudfront.OriginAccessControl(group, 'ssr-access', {
					name: `${name}-ssr`,
					originAccessControlOriginType: 'lambda',
					signingBehavior: 'always',
					signingProtocol: 'sigv4',
				})

				// ssrAccessControl.deletionPolicy = 'after-deployment'

				origins.push({
					originId: 'ssr',
					domainName: url.functionUrl.pipe(url => url.split('/')[2]!),
					originAccessControlId: ssrAccessControl.id,
					customOriginConfig: {
						originProtocolPolicy: 'https-only',
						httpPort: 80,
						httpsPort: 443,
						originSslProtocols: ['TLSv1.2'],
					},
				})
			}

			if (props.static) {
				bucket = new $.aws.s3.Bucket(group, 'bucket', {
					bucket: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'site',
						resourceName: id,
						postfix: ctx.appId,
					}),
					forceDestroy: true,
					website: {
						indexDocument: 'index.html',
						errorDocument: props.ssr ? undefined : 'error.html',
					},
					corsRule: [
						{
							allowedOrigins: ['*'],
							allowedHeaders: ['*'],
							allowedMethods: ['GET', 'HEAD'],
							exposeHeaders: ['content-type', 'cache-control'],
						},
					],
				})

				ctx.addStackPermission({
					actions: [
						's3:ListBucket',
						's3:ListBucketV2',
						's3:HeadObject',
						's3:GetObject',
						's3:PutObject',
						's3:DeleteObject',
						's3:CopyObject',
						's3:GetObjectAttributes',
					],
					resources: [
						//
						bucket.arn,
						bucket.arn.pipe(arn => `${arn}/*`),
					],
				})

				// bucket.deletionPolicy = 'after-deployment'

				const accessControl = new $.aws.cloudfront.OriginAccessControl(group, `access`, {
					name,
					originAccessControlOriginType: 's3',
					signingBehavior: 'always',
					signingProtocol: 'sigv4',
				})

				// accessControl.deletionPolicy = 'after-deployment'

				ctx.onReady(() => {
					if (typeof props.static === 'string') {
						const files = glob.sync('**', {
							// cwd: join(directories.root, props.static),
							cwd: props.static,
							nodir: true,
						})

						// console.log(join(directories.root, props.static))

						for (const file of files) {
							const object = new $.aws.s3.BucketObject(group, file, {
								bucket: bucket.bucket,
								key: file,
								cacheControl: getCacheControl(file),
								contentType: getContentType(file),
								source: join(props.static, file),
								sourceHash: $hash(join(props.static, file)),
							})

							// console.log(file)

							versions.push(object.key)
							versions.push(object.sourceHash)
						}
					}
				})

				origins.push({
					originId: 'static',
					domainName: bucket.bucketRegionalDomainName,
					originAccessControlId: accessControl.id,
					s3OriginConfig: {
						// is required to have an value for s3 origins when using origin access control
						originAccessIdentity: '',
					},
				})
			}

			if (props.ssr && props.static) {
				originGroups.push({
					originId: 'group',
					member:
						props.origin === 'ssr-first'
							? [{ originId: 'ssr' }, { originId: 'static' }]
							: [{ originId: 'static' }, { originId: 'ssr' }],
					failoverCriteria: {
						statusCodes: [403, 404],
					},
				})
			}

			const cache = new $.aws.cloudfront.CachePolicy(group, 'cache', {
				name,
				minTtl: toSeconds(seconds(1)),
				maxTtl: toSeconds(days(365)),
				defaultTtl: toSeconds(days(1)),
				parametersInCacheKeyAndForwardedToOrigin: {
					cookiesConfig: {
						cookieBehavior: props.cache?.cookies ? 'whitelist' : 'none',
						cookies: {
							items: props.cache?.cookies,
						},
					},
					headersConfig: {
						headerBehavior: props.cache?.headers ? 'whitelist' : 'none',
						headers: {
							items: props.cache?.headers,
						},
					},
					queryStringsConfig: {
						queryStringBehavior: props.cache?.queries ? 'whitelist' : 'none',
						queryStrings: {
							items: props.cache?.queries,
						},
					},
				},
			})

			const originRequest = new $.aws.cloudfront.OriginRequestPolicy(group, 'request', {
				name,
				headersConfig: {
					headerBehavior: camelCase('all-except'),
					headers: {
						items: ['host', 'authorization'],
					},
				},
				cookiesConfig: {
					cookieBehavior: 'all',
				},
				queryStringsConfig: {
					queryStringBehavior: 'all',
				},
			})

			const responseHeaders = new $.aws.cloudfront.ResponseHeadersPolicy(group, 'response', {
				name,
				corsConfig: {
					originOverride: props.cors?.override ?? false,
					accessControlMaxAgeSec: toSeconds(props.cors?.maxAge ?? days(365)),
					accessControlAllowHeaders: { items: props.cors?.headers ?? ['*'] },
					accessControlAllowMethods: { items: props.cors?.methods ?? ['ALL'] },
					accessControlAllowOrigins: { items: props.cors?.origins ?? ['*'] },
					accessControlExposeHeaders: { items: props.cors?.exposeHeaders ?? ['*'] },
					accessControlAllowCredentials: props.cors?.credentials ?? false,
				},
				removeHeadersConfig: {
					items: [{ header: 'server' }],
				},
				securityHeadersConfig: {
					contentTypeOptions: {
						override: false,
					},
					frameOptions: {
						override: false,
						frameOption: 'SAMEORIGIN',
					},
					referrerPolicy: {
						override: false,
						referrerPolicy: 'same-origin',
					},
					strictTransportSecurity: {
						override: false,
						preload: true,
						accessControlMaxAgeSec: toSeconds(days(365)),
						includeSubdomains: true,
					},
					xssProtection: {
						override: false,
						modeBlock: true,
						protection: true,
					},
				},
			})

			const domainName = props.domain
				? formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				: undefined

			const certificateArn = props.domain
				? ctx.shared.entry('domain', `global-certificate-arn`, props.domain)
				: undefined

			const associations: {
				eventType: string
				functionArn: Input<string>
			}[] = []

			if (props.forwardHost) {
				const viewerRequest = new $.aws.cloudfront.Function(group, 'forward-host', {
					name: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'site',
						resourceName: 'forward-host',
					}),
					runtime: `cloudfront-js-2.0`,
					comment: 'Forward the host header to the origin',
					publish: true,
					code: getForwardHostFunctionCode(),
				})

				associations.push({
					eventType: 'viewer-request',
					functionArn: viewerRequest.arn,
				})
			}

			const distribution = new $.aws.cloudfront.Distribution(group, 'distribution', {
				// name,
				tags: {
					Name: name,
				},
				enabled: true,
				aliases: domainName ? [domainName] : undefined,
				priceClass: 'PriceClass_All',
				httpVersion: 'http2and3',
				viewerCertificate: certificateArn
					? {
							sslSupportMethod: 'sni-only',
							minimumProtocolVersion: 'TLSv1.2_2021',
							acmCertificateArn: certificateArn,
						}
					: {
							cloudfrontDefaultCertificate: true,
						},

				origin: origins,
				originGroup: originGroups,
				customErrorResponse: Object.entries(props.errors ?? {}).map(([errorCode, item]) => {
					if (typeof item === 'string') {
						return {
							errorCode: Number(errorCode),
							responseCode: Number(errorCode),
							responsePagePath: item,
						}
					}

					return {
						errorCode: Number(errorCode),
						cacheMinTTL: item.minTTL ? toSeconds(item.minTTL) : undefined,
						responseCode: item.statusCode ?? Number(errorCode),
						responsePagePath: item.path,
					}
				}),

				restrictions: {
					geoRestriction: {
						restrictionType: props.geoRestrictions.length > 0 ? 'blacklist' : 'none',
						locations: props.geoRestrictions,
					},
				},

				defaultCacheBehavior: {
					compress: true,
					targetOriginId: props.ssr && props.static ? 'group' : props.ssr ? 'ssr' : 'static',
					functionAssociation: associations,
					originRequestPolicyId: originRequest.id,
					cachePolicyId: cache.id,
					responseHeadersPolicyId: responseHeaders.id,
					viewerProtocolPolicy: 'redirect-to-https',
					allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
					cachedMethods: ['GET', 'HEAD'],
					// cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
					// cachedMethods: [],
				},
			})

			new Invalidation(group, 'invalidate', {
				distributionId: distribution.id,
				paths: ['/*'],
				version: new Future(resolve => {
					$combine(...versions).then(versions => {
						const combined = versions
							.filter(v => !!v)
							.sort()
							.join(',')

						const version = createHash('sha1').update(combined).digest('hex')

						resolve(version)
					})
				}),
			})

			if (props.static) {
				new $.aws.s3.BucketPolicy(
					group,
					`policy`,
					{
						bucket: bucket!.bucket,
						policy: $resolve([bucket!.arn, distribution.id], (arn, id) => {
							return JSON.stringify({
								Version: '2012-10-17',
								Statement: [
									{
										Effect: 'Allow',
										Action: 's3:GetObject',
										Resource: `${arn}/*`,
										Principal: {
											Service: 'cloudfront.amazonaws.com',
										},
										Condition: {
											StringEquals: {
												'AWS:SourceArn': `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`,
											},
										},
									},
								],
							})
						}),
					},
					{
						dependsOn: [bucket!, distribution],
					}
				)
			}

			if (domainName) {
				new $.aws.route53.Record(group, `record`, {
					zoneId: ctx.shared.entry('domain', 'zone-id', props.domain!),
					type: 'A',
					name: domainName,
					alias: {
						name: distribution.domainName,
						zoneId: distribution.hostedZoneId,
						evaluateTargetHealth: false,
					},
				})
			}

			if (domainName) {
				ctx.bind(`SITE_${constantCase(ctx.stack.name)}_${constantCase(id)}_ENDPOINT`, domainName)
			}
		}
	},
})
