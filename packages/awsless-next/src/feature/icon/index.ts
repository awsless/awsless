import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature'
import { formatLocalResourceName } from '../../util/name'
import { createLambdaFunction } from '../function/util'
import { join, dirname } from 'path'
import { formatFullDomainName } from '../domain/util'
import { createPrebuildLambdaFunction } from '../function/prebuild'
import { mebibytes } from '@awsless/size'
import { days, seconds, toDays, toSeconds } from '@awsless/duration'
import { constantCase } from 'change-case'
import { fileURLToPath } from 'url'
import { glob } from 'glob'
import { shortId } from '../../util/id'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const iconFeature = defineFeature({
	name: 'icon',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.icons ?? {})) {
			const group = new Group(ctx.stack, 'icon', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'icon',
				resourceName: id,
			})

			// ------------------------------------------------------------
			// Create the icon origins

			let lambdaOrigin: ReturnType<typeof createLambdaFunction> | undefined = undefined

			if (props.origin.function) {
				lambdaOrigin = createLambdaFunction(group, ctx, 'origin', id, props.origin.function)
			}

			let s3Origin: $.aws.s3.Bucket | undefined

			if (props.origin.static) {
				s3Origin = new $.aws.s3.Bucket(group, 'origin', {
					bucket: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'icon',
						resourceName: shortId(`${id}-${ctx.appId}`),
					}),
					forceDestroy: true,
				})
			}

			// ------------------------------------------------------------
			// Create the icon cache

			const cacheBucket = new $.aws.s3.Bucket(group, 'cache', {
				bucket: formatLocalResourceName({
					appName: ctx.app.name,
					stackName: ctx.stack.name,
					resourceType: 'icon',
					resourceName: shortId(`cache-${id}-${ctx.appId}`),
				}),
				tags: {
					cache: 'true',
				},
				forceDestroy: true,

				...(props.cacheDuration
					? {
							lifecycleRule: [
								{
									enabled: true,
									id: 'icon-cache-duration',
									expiration: {
										days: toDays(props.cacheDuration),
									},
								},
							],
						}
					: {}),
			})

			// ------------------------------------------------------------
			// Create the icon server function

			const serverLambda = createPrebuildLambdaFunction(group, ctx, 'icon', id, {
				bundleFile: join(__dirname, '/prebuild/icon/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/icon/HASH'),
				memorySize: mebibytes(512),
				timeout: seconds(10),
				handler: 'index.default',
				runtime: 'nodejs22.x',
				log: props.log,
			})

			const permission = new $.aws.lambda.Permission(group, 'permission', {
				principal: 'cloudfront.amazonaws.com',
				action: 'lambda:InvokeFunctionUrl',
				functionName: serverLambda.lambda.functionName,
				functionUrlAuthType: 'AWS_IAM',
				sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
			})

			const serverLambdaUrl = new $.aws.lambda.FunctionUrl(
				group,
				'url',
				{
					functionName: serverLambda.lambda.functionName,
					authorizationType: 'AWS_IAM',
				},
				{ dependsOn: [permission] }
			)

			serverLambda.addPermission({
				actions: [
					's3:ListBucket',
					's3:ListBucketV2',
					's3:HeadObject',
					's3:GetObject',
					's3:PutObject',
					's3:DeleteObject',
					's3:GetObjectAttributes',
				],
				resources: [
					//
					cacheBucket.arn,
					cacheBucket.arn.pipe(arn => `${arn}/*`),
					...(s3Origin ? [s3Origin.arn, s3Origin.arn.pipe(arn => `${arn}/*`)] : []),
				],
			})

			serverLambda.setEnvironment(
				'ICON_CONFIG',
				JSON.stringify({
					preserveId: props.preserveId,
					symbols: props.symbols,
				})
			)

			serverLambda.setEnvironment('ICON_CACHE_BUCKET', cacheBucket.bucket)

			if (lambdaOrigin) {
				serverLambda.setEnvironment('ICON_ORIGIN_LAMBDA', lambdaOrigin.name)
			}

			if (s3Origin) {
				serverLambda.setEnvironment('ICON_ORIGIN_S3', s3Origin.bucket)
			}

			// ------------------------------------------------------------
			// Upload static icons to S3

			ctx.onReady(() => {
				if (props.origin.static && s3Origin) {
					const files = glob.sync('**', {
						cwd: props.origin.static,
						nodir: true,
					})

					for (const file of files) {
						if (!file.endsWith('.svg')) {
							throw new Error(`Icon file "${file}" in "${props.origin.static}" is not an SVG file.`)
						}

						new $.aws.s3.BucketObject(group, `static-${file}`, {
							bucket: s3Origin.bucket,
							key: file,
							source: join(props.origin.static, file),
							sourceHash: $hash(join(props.origin.static, file)),
						})
					}
				}
			})

			// ------------------------------------------------------------
			// Domain stuff

			const domainName = props.domain
				? formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				: undefined

			const certificateArn = props.domain
				? ctx.shared.entry('domain', `global-certificate-arn`, props.domain)
				: undefined

			// ------------------------------------------------------------
			// CND + Invalidation

			const s3AccessControl = new $.aws.cloudfront.OriginAccessControl(group, `s3`, {
				name: `${name}-s3`,
				description: `Policy for the ${id} icon cache in S3`,
				originAccessControlOriginType: 's3',
				signingBehavior: 'always',
				signingProtocol: 'sigv4',
			})

			const lambdaAccessControl = new $.aws.cloudfront.OriginAccessControl(group, 'lambda', {
				name: `${name}-lambda`,
				description: `Policy for the ${id} icon lambda server function URL`,
				originAccessControlOriginType: 'lambda',
				signingBehavior: 'always',
				signingProtocol: 'sigv4',
			})

			const cache = new $.aws.cloudfront.CachePolicy(group, 'cache', {
				name,
				defaultTtl: toSeconds(days(365)),
			})

			const responseHeaders = new $.aws.cloudfront.ResponseHeadersPolicy(group, 'response', {
				name,
				corsConfig: {
					originOverride: true,
					accessControlMaxAgeSec: toSeconds(days(365)),
					accessControlAllowHeaders: { items: ['*'] },
					accessControlAllowMethods: { items: ['ALL'] },
					accessControlAllowOrigins: { items: ['*'] },
					accessControlExposeHeaders: { items: ['*'] },
					accessControlAllowCredentials: false,
				},
			})

			const distribution = new $.aws.cloudfront.Distribution(group, 'distribution', {
				waitForDeployment: false,
				comment: name,
				enabled: true,
				aliases: domainName ? [domainName] : undefined,
				priceClass: 'PriceClass_All',
				httpVersion: 'http2and3',

				restrictions: {
					geoRestriction: {
						restrictionType: 'none',
						locations: [],
					},
				},

				viewerCertificate: certificateArn
					? {
							sslSupportMethod: 'sni-only',
							minimumProtocolVersion: 'TLSv1.2_2021',
							acmCertificateArn: certificateArn,
						}
					: {
							cloudfrontDefaultCertificate: true,
						},

				origin: [
					{
						originId: 'cache',
						domainName: cacheBucket.bucketRegionalDomainName,
						originAccessControlId: s3AccessControl.id,
						s3OriginConfig: {
							// is required to have an value for s3 origins when using origin access control
							originAccessIdentity: '',
						},
					},

					{
						originId: 'server',
						domainName: serverLambdaUrl.functionUrl.pipe(url => url.split('/')[2]!),
						originAccessControlId: lambdaAccessControl.id,
						customOriginConfig: {
							originProtocolPolicy: 'https-only',
							httpPort: 80,
							httpsPort: 443,
							originSslProtocols: ['TLSv1.2'],
						},
					},
				],

				originGroup: [
					{
						originId: 'group',
						member: [{ originId: 'cache' }, { originId: 'server' }],
						failoverCriteria: {
							statusCodes: [403, 404],
						},
					},
				],

				defaultCacheBehavior: {
					compress: true,
					targetOriginId: 'group',
					cachePolicyId: cache.id,
					viewerProtocolPolicy: 'redirect-to-https',
					allowedMethods: ['GET', 'HEAD'],
					cachedMethods: ['GET', 'HEAD'],
					responseHeadersPolicyId: responseHeaders.id,
				},
			})

			// ------------------------------------------------------------
			// Give the distribution the permissions to access the cache bucket

			new $.aws.s3.BucketPolicy(
				group,
				`policy`,
				{
					bucket: cacheBucket.bucket,
					policy: $resolve([cacheBucket.arn, distribution.id], (arn, id) => {
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
					dependsOn: [cacheBucket, distribution],
				}
			)

			// ------------------------------------------------------------
			// Domain name records and endpoint binding

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

			ctx.bind(
				`ICON_${constantCase(ctx.stack.name)}_${constantCase(id)}_ENDPOINT`,
				domainName ?? distribution.domainName
			)

			ctx.shared.add('icon', 'distribution-id', id, distribution.id)
			ctx.shared.add('icon', 'cache-bucket', id, cacheBucket.bucket)
		}
	},
})
