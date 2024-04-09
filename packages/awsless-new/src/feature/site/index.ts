import { Asset, Node, Input, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { formatLocalResourceName } from '../../util/name.js'
import { days, seconds } from '@awsless/duration'
import { formatFullDomainName } from '../domain/util.js'
import { glob } from 'glob'
import { join } from 'path'
import { getCacheControl, getContentType } from './util.js'

export const siteFeature = defineFeature({
	name: 'site',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.sites ?? {})) {
			const group = new Node('site', id)
			ctx.stack.add(group)

			const name = formatLocalResourceName(ctx.app.name, ctx.stack.name, 'site', id)
			const origins: aws.cloudFront.Origin[] = []
			const originGroups: aws.cloudFront.OriginGroup[] = []

			let bucket: aws.s3.Bucket
			const versions: Array<Input<string | undefined> | Input<string>> = []
			// let lambda: aws.lambda.Function
			// let code: aws.s3.BucketObject

			if (props.ssr) {
				const { lambda, code } = createLambdaFunction(group, ctx, `site`, id, props.ssr)

				versions.push(code.version)

				// lambda = result.lambda
				// code = result.code

				const permissions = new aws.lambda.Permission('permission', {
					principal: '*',
					// principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunctionUrl',
					functionArn: lambda.arn,
					urlAuthType: 'none',
					// urlAuthType: 'aws-iam',
					// sourceArn: distribution.arn,
				})

				group.add(permissions)

				const url = new aws.lambda.Url('url', {
					targetArn: lambda.arn,
					authType: 'none',
					// authType: 'aws-iam',
				})

				group.add(url)

				origins.push({
					id: 'ssr',
					domainName: url.url.apply<string>(url => url.split('/')[2]!),
					protocol: 'https-only',
				})
			}

			if (props.static) {
				bucket = new aws.s3.Bucket('bucket', {
					name,
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

				bucket.deletionPolicy = 'after-deployment'

				group.add(bucket)

				const accessControl = new aws.cloudFront.OriginAccessControl(`access`, {
					name,
					type: 's3',
					behavior: 'always',
					protocol: 'sigv4',
				})

				accessControl.deletionPolicy = 'after-deployment'

				group.add(accessControl)

				const files = glob.sync('**', {
					cwd: props.static,
					nodir: true,
				})

				for (const file of files) {
					const object = new aws.s3.BucketObject(file, {
						bucket: bucket.name,
						key: file,
						body: Asset.fromFile(join(props.static, file)),
						cacheControl: getCacheControl(file),
						contentType: getContentType(file),
					})

					group.add(object)

					versions.push(object.key)
					versions.push(object.etag)
				}

				origins.push({
					id: 'static',
					domainName: bucket.regionalDomainName,
					originAccessControlId: accessControl.id,
				})
			}

			if (props.ssr && props.static) {
				originGroups.push({
					id: 'group',
					members: ['ssr', 'static'],
					statusCodes: [403, 404],
				})
			}

			const cache = new aws.cloudFront.CachePolicy('cache', {
				name,
				minTtl: seconds(1),
				maxTtl: days(365),
				defaultTtl: days(1),
				...props.cache,
			})

			group.add(cache)

			const originRequest = new aws.cloudFront.OriginRequestPolicy('request', {
				name,
				header: {
					behavior: 'all-except',
					values: ['host', 'authorization'],
				},
			})

			group.add(originRequest)

			const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
			const responseHeaders = new aws.cloudFront.ResponseHeadersPolicy('response', {
				name,
				cors: props.cors,
				remove: ['server'],
				// contentTypeOptions: {
				// 	override: true,
				// },
			})

			group.add(responseHeaders)

			// const aliases: string[] = [ domainName ]
			// if(!props.subDomain) {
			// 	aliases.push(`www.${props.domain}`)
			// }

			// console.log(domainName)

			const distribution = new aws.cloudFront.Distribution('distribution', {
				name,
				certificateArn: ctx.app.import('base', `global-certificate-${props.domain}-arn`),
				compress: true,
				aliases: [domainName],
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

			group.add(distribution)

			const invalidate = new aws.cloudFront.InvalidateCache('invalidate', {
				distributionId: distribution.id,
				paths: ['/*'],
				versions,
			})

			group.add(invalidate)

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

				const bucketPolicy = new aws.s3.BucketPolicy(`policy`, {
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

				group.add(bucketPolicy)
			}

			const record = new aws.route53.RecordSet(`record`, {
				hostedZoneId: ctx.app.import('base', `hosted-zone-${props.domain}-id`),
				type: 'A',
				name: domainName,
				alias: {
					dnsName: distribution.domainName,
					hostedZoneId: distribution.hostedZoneId,
					evaluateTargetHealth: false,
				},
			})

			group.add(record)
		}
	},
})
