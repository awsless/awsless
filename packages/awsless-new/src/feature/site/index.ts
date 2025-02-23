import { days, seconds } from '@awsless/duration'
import { Asset, aws, Input, Node } from '@awsless/formation'
import { glob } from 'glob'
import { join } from 'path'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { createLambdaFunction } from '../function/util.js'
import { getCacheControl, getContentType } from './util.js'
import { constantCase } from 'change-case'

export const siteFeature = defineFeature({
	name: 'site',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.sites ?? {})) {
			const group = new Node(ctx.stack, 'site', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'site',
				resourceName: id,
			})

			const origins: aws.cloudFront.Origin[] = []
			const originGroups: aws.cloudFront.OriginGroup[] = []

			let bucket: aws.s3.Bucket
			const versions: Array<Input<string | undefined> | Input<string>> = []
			// let lambda: aws.lambda.Function
			// let code: aws.s3.BucketObject

			if (props.ssr) {
				const { lambda, code } = createLambdaFunction(group, ctx, `site`, id, props.ssr)

				if ('version' in code) {
					versions.push(code.version)
				}

				ctx.onBind((name, value) => {
					lambda.addEnvironment(name, value)
				})

				// ctx.registerSiteFunction(lambda)

				// lambda = result.lambda
				// code = result.code

				new aws.lambda.Permission(group, 'ssr-permission', {
					principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunctionUrl',
					functionArn: lambda.arn,
					urlAuthType: 'aws-iam',
					sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
				})

				const url = new aws.lambda.Url(group, 'url', {
					targetArn: lambda.arn,
					authType: 'aws-iam',
				})

				const ssrAccessControl = new aws.cloudFront.OriginAccessControl(group, 'ssr-access', {
					name: `${name}-ssr`,
					type: 'lambda',
					behavior: 'always',
					protocol: 'sigv4',
				})

				ssrAccessControl.deletionPolicy = 'after-deployment'

				origins.push({
					id: 'ssr',
					domainName: url.url.apply<string>(url => url.split('/')[2]!),
					protocol: 'https-only',
					originAccessControlId: ssrAccessControl.id,
				})
			}

			if (props.static) {
				bucket = new aws.s3.Bucket(group, 'bucket', {
					name: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'site',
						resourceName: id,
						postfix: ctx.appId,
					}),
					forceDelete: true,
					website: {
						indexDocument: 'index.html',
						errorDocument: props.ssr ? undefined : 'error.html',
					},
					cors: [
						{
							origins: ['*'],
							headers: ['*'],
							methods: ['GET', 'HEAD'],
							exposeHeaders: ['content-type', 'cache-control'],
						},
					],
				})

				ctx.onStackPolicy(policy => {
					policy.addStatement(bucket.permissions)
				})

				bucket.deletionPolicy = 'after-deployment'

				const accessControl = new aws.cloudFront.OriginAccessControl(group, `access`, {
					name,
					type: 's3',
					behavior: 'always',
					protocol: 'sigv4',
				})

				accessControl.deletionPolicy = 'after-deployment'

				if (typeof props.static === 'string') {
					const files = glob.sync('**', {
						cwd: props.static,
						nodir: true,
					})

					for (const file of files) {
						const object = new aws.s3.BucketObject(group, file, {
							bucket: bucket.name,
							key: file,
							body: Asset.fromFile(join(props.static, file)),
							cacheControl: getCacheControl(file),
							contentType: getContentType(file),
						})

						versions.push(object.key)
						versions.push(object.etag)
					}
				}

				origins.push({
					id: 'static',
					domainName: bucket.regionalDomainName,
					originAccessControlId: accessControl.id,
					originAccessIdentityId: '', // is required to have an value for s3 origins when using origin access control
				})
			}

			if (props.ssr && props.static) {
				originGroups.push({
					id: 'group',
					members: props.origin === 'ssr-first' ? ['ssr', 'static'] : ['static', 'ssr'],
					statusCodes: [403, 404],
				})
			}

			const cache = new aws.cloudFront.CachePolicy(group, 'cache', {
				name,
				minTtl: seconds(1),
				maxTtl: days(365),
				defaultTtl: days(1),
				...props.cache,
			})

			const originRequest = new aws.cloudFront.OriginRequestPolicy(group, 'request', {
				name,
				header: {
					behavior: 'all-except',
					values: ['host', 'authorization'],
				},
			})

			const responseHeaders = new aws.cloudFront.ResponseHeadersPolicy(group, 'response', {
				name,
				cors: props.cors,
				remove: ['server'],
				// contentTypeOptions: {
				// 	override: true,
				// },
			})

			// const aliases: string[] = [ domainName ]
			// if(!props.subDomain) {
			// 	aliases.push(`www.${props.domain}`)
			// }

			// console.log(domainName)

			const domainName = props.domain
				? formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				: undefined

			const certificateArn = props.domain
				? ctx.shared.get<aws.ARN>(`global-certificate-${props.domain}-arn`)
				: undefined

			const distribution = new aws.cloudFront.Distribution(group, 'distribution', {
				name,
				compress: true,
				certificateArn,
				aliases: domainName ? [domainName] : undefined,
				origins,
				originGroups,
				// defaultRootObject: 'index.html',
				targetOriginId: props.ssr && props.static ? 'group' : props.ssr ? 'ssr' : 'static',
				originRequestPolicyId: originRequest.id,
				cachePolicyId: cache.id,
				responseHeadersPolicyId: responseHeaders.id,
				customErrorResponses: Object.entries(props.errors ?? {}).map(([errorCode, item]) => {
					if (typeof item === 'string') {
						return {
							errorCode,
							responsePath: item,
							responseCode: Number(errorCode),
						}
					}

					return {
						errorCode,
						cacheMinTTL: item.minTTL,
						responsePath: item.path,
						responseCode: item.statusCode ?? Number(errorCode),
					}
				}),
			})

			new aws.cloudFront.InvalidateCache(group, 'invalidate', {
				distributionId: distribution.id,
				paths: ['/*'],
				versions,
			})

			// if (props.ssr) {
			// 	const permissions = new aws.lambda.Permission('permission', {
			// 		principal: 'cloudfront.amazonaws.com',
			// 		action: 'lambda:InvokeFunctionUrl',
			// 		functionArn: lambda!.arn,
			// 		urlAuthType: 'aws-iam',
			// 		sourceArn: distributionArn,
			// 	})

			// 	group.add(permissions)
			// }

			if (props.static) {
				// const distributionArn = distribution.id.apply<aws.ARN>(id => {
				// 	return `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`
				// })

				new aws.s3.BucketPolicy(group, `policy`, {
					bucketName: bucket!.name,
					statements: [
						{
							principal: 'cloudfront.amazonaws.com',
							actions: ['s3:GetObject'],
							resources: [bucket!.arn.apply<aws.ARN>(arn => `${arn}/*`)],
							// sourceArn: distributionArn,
							sourceArn: distribution.id.apply<aws.ARN>(id => {
								return `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`
							}),

							// principal: '*',
							// actions: ['s3:GetObject'],
							// resources: [bucket!.arn.apply<aws.ARN>(arn => `${arn}/*`)],
							// sourceArn: distribution.id.apply<aws.ARN>(id => {
							// 	return `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`
							// }),
						},
						// {
						// 	principal: distribution.id,
						// 	actions: [ 's3:GetObject' ],
						// 	resources: [ oac.attrId ]
						// }
					],
				})
			}

			// if(props.forwardHost) {
			// 	new aws.cloudFront.Function()
			// }

			if (domainName) {
				new aws.route53.RecordSet(group, `record`, {
					hostedZoneId: ctx.shared.get(`hosted-zone-${props.domain}-id`),
					type: 'A',
					name: domainName,
					alias: distribution.aliasTarget,
				})
			}

			ctx.bind(
				`SITE_${constantCase(ctx.stack.name)}_${constantCase(id)}_ENDPOINT`,
				domainName ? domainName : distribution.domainName
			)
		}
	},
})
