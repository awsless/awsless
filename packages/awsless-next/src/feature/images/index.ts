import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name'
import { createLambdaFunction } from '../function/util'
import { join, dirname } from 'path'
import { formatFullDomainName } from '../domain/util'
import { createPrebuildLambdaFunction } from '../function/prebuild'
import { mebibytes } from '@awsless/size'
import { days, seconds, toSeconds } from '@awsless/duration'
import { constantCase } from 'change-case'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const imagesFeature = defineFeature({
	name: 'images',
	onApp(ctx) {
		const found = ctx.stackConfigs.filter(stack => {
			return Object.keys(stack.images ?? {}).length > 0
		})

		if (!found) {
			return
		}

		// ------------------------------------------------------------
		// Create the layer for the image transformation function

		const group = new Group(ctx.base, 'image', 'layer')

		const path = join(__dirname, '/layers/sharp-arm.zip')

		const layerId = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: 'layer',
			resourceName: 'sharp',
		})

		const zipFile = new $.aws.s3.BucketObject(group, 'layer', {
			bucket: ctx.shared.get('layer', 'bucket-name'),
			key: `/layer/${layerId}.zip`,
			contentType: 'application/zip',
			source: path,
			sourceHash: $hash(path),
		})

		const layer = new $.aws.lambda.LayerVersion(group, 'layer', {
			layerName: layerId,
			description: 'sharp-arm.zip for the awsless images feature.',
			compatibleArchitectures: ['arm64'],
			s3Bucket: zipFile.bucket,
			s3ObjectVersion: zipFile.versionId,
			s3Key: zipFile.key.pipe(name => {
				if (name.startsWith('/')) {
					return name.substring(1)
				}

				return name
			}),
			sourceCodeHash: $hash(path),
		})

		ctx.shared.add('layer', 'arn', layerId, layer.arn)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.images ?? {})) {
			const group = new Group(ctx.stack, 'images', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'images',
				resourceName: id,
			})

			// ------------------------------------------------------------
			// Create the image origins

			let lambdaOrigin: ReturnType<typeof createLambdaFunction> | undefined = undefined

			if (props.origin.function) {
				lambdaOrigin = createLambdaFunction(group, ctx, `origin`, id, props.origin.function)
			}

			let s3Origin: $.aws.s3.Bucket | undefined

			if (props.origin.static) {
				s3Origin = new $.aws.s3.Bucket(group, 'origin', {
					bucket: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'images',
						resourceName: id,
						postfix: ctx.appId,
					}),
					forceDestroy: true,
				})
			}

			// ------------------------------------------------------------
			// Create the image transformation cache

			const cacheBucket = new $.aws.s3.Bucket(group, 'cache', {
				bucket: formatLocalResourceName({
					appName: ctx.app.name,
					stackName: ctx.stack.name,
					resourceType: 'images',
					resourceName: `cache-${id}`,
					postfix: ctx.appId,
				}),
				forceDestroy: true,
			})

			// ------------------------------------------------------------
			// Create the image transformation function

			const sharpLayerId = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'layer',
				resourceName: 'sharp',
			})

			const transformFn = createPrebuildLambdaFunction(group, ctx, 'images', id, {
				bundleFile: join(__dirname, '/prebuild/images/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/images/HASH'),
				memorySize: mebibytes(512),
				timeout: seconds(10),
				handler: 'index.default',
				runtime: 'nodejs22.x',
				log: props.log,
				layers: [sharpLayerId],
			})

			const permission = new $.aws.lambda.Permission(group, 'permission', {
				principal: 'cloudfront.amazonaws.com',
				action: 'lambda:InvokeFunctionUrl',
				functionName: transformFn.lambda.functionName,
				functionUrlAuthType: 'AWS_IAM',
				sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
			})

			const transformFnUrl = new $.aws.lambda.FunctionUrl(
				group,
				'url',
				{
					functionName: transformFn.lambda.functionName,
					authorizationType: 'AWS_IAM',
				},
				{ dependsOn: [permission] }
			)

			transformFn.addPermission({
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

			transformFn.setEnvironment(
				'IMAGES_CONFIG',
				JSON.stringify({
					presets: props.presets,
					extensions: props.extensions,
					version: props.version,
				})
			)

			// new UpdateFunctionCode(group, 'update', {
			// 	version: '',

			// 	functionName: transformFn.lambda.functionName,
			// 	architectures: transformFn.lambda.architectures as any,
			// 	s3Bucket: transformFn.lambda.s3Bucket,
			// 	s3Key: transformFn.lambda.s3Key,
			// 	s3ObjectVersion: transformFn.lambda.s3ObjectVersion,
			// 	imageUri: transformFn.lambda.imageUri,
			// })

			transformFn.setEnvironment('IMAGES_CACHE_BUCKET', cacheBucket.bucket)

			if (lambdaOrigin) {
				transformFn.setEnvironment('IMAGES_ORIGIN_LAMBDA', lambdaOrigin.name)
			}

			if (s3Origin) {
				transformFn.setEnvironment('IMAGES_ORIGIN_S3', s3Origin.bucket)
			}

			// ------------------------------------------------------------
			// Upload static images

			ctx.onReady(() => {
				if (props.origin.static && s3Origin) {
					const files = glob.sync('**', {
						cwd: props.origin.static,
						nodir: true,
					})

					for (const file of files) {
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
				description: 'Policy for Images cache in S3',
				originAccessControlOriginType: 's3',
				signingBehavior: 'always',
				signingProtocol: 'sigv4',
			})

			const lambdaAccessControl = new $.aws.cloudfront.OriginAccessControl(group, 'lambda', {
				name: `${name}-lambda`,
				description: 'Policy for Images Lambda Transformation Function URL',
				originAccessControlOriginType: 'lambda',
				signingBehavior: 'always',
				signingProtocol: 'sigv4',
			})

			const cache = new $.aws.cloudfront.CachePolicy(group, 'cache', {
				name,
				defaultTtl: toSeconds(days(365)),
			})

			const distribution = new $.aws.cloudfront.Distribution(group, 'distribution', {
				comment: name,
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
						originId: 'transform',
						domainName: transformFnUrl.functionUrl.pipe(url => url.split('/')[2]!),
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
						member: [{ originId: 'cache' }, { originId: 'transform' }],
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

				ctx.bind(`IMAGES_${ctx.stack.name}_${constantCase(id)}_ENDPOINT`, domainName)
			} else {
				ctx.bind(`IMAGES_${ctx.stack.name}_${constantCase(id)}_ENDPOINT`, distribution.domainName)
			}
		}
	},
})
