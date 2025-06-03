import { $, Group, Input } from '@awsless/formation'
import { defineFeature } from '../../feature'
import { formatLocalResourceName } from '../../util/name'
import { createLambdaFunction } from '../function/util'
import { glob } from 'glob'
import { join, extname, dirname } from 'path'
import { contentType } from 'mime-types'
import { Invalidation } from '../../formation/cloudfront'
import { Future } from '@awsless/formation'
import { createHash } from 'crypto'
import { formatFullDomainName } from '../domain/util'
import { createPrebuildLambdaFunction } from '../function/prebuild'
import { mebibytes } from '@awsless/size'
import { days, seconds, toSeconds, weeks } from '@awsless/duration'
import { UpdateFunctionCode } from '../../formation/lambda'
import { constantCase } from 'change-case'
import { shortId } from '../../util/id'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const imagesFeature = defineFeature({
	name: 'images',
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

			const originGroup = new Group(ctx.stack, 'images-origins', id)

			let lambdaOrigin: ReturnType<typeof createLambdaFunction> | undefined = undefined

			if (props.origin.function) {
				lambdaOrigin = createLambdaFunction(originGroup, ctx, `lambda-origin`, id, props.origin.function)
			}

			let s3Origin: $.aws.s3.Bucket | undefined

			if (props.origin.static) {
				s3Origin = new $.aws.s3.Bucket(originGroup, 'bucket', {
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
			// Create the layer for the image transformation function

			const path = join(__dirname, '/layers/sharp-arm.zip')

			const layerId = formatLocalResourceName({
				appName: ctx.appConfig.name,
				stackName: ctx.stack.name,
				resourceType: 'layer',
				resourceName: shortId(id),
			})

			const zipFile = new $.aws.s3.BucketObject(group, 'layer-zip', {
				bucket: ctx.shared.get('layer', 'bucket-name'),
				key: `/layer/${layerId}.zip`,
				contentType: 'application/zip',
				source: path,
				sourceHash: $hash(path),
			})

			const layer = new $.aws.lambda.LayerVersion(
				group,
				'layer',
				{
					layerName: layerId,
					description: 'sharp-arm.zip for the awsless images feature.',
					compatibleArchitectures: ['arm64'],
					compatibleRuntimes: ['nodejs22.x'],
					s3Bucket: zipFile.bucket,
					s3ObjectVersion: zipFile.versionId,
					s3Key: zipFile.key.pipe(name => {
						if (name.startsWith('/')) {
							return name.substring(1)
						}

						return name
					}),
					sourceCodeHash: $hash(path),
				},
				{
					dependsOn: [zipFile],
				}
			)

			ctx.shared.add('layer', 'arn', layerId, layer.arn)

			// ------------------------------------------------------------
			// Create the image transformation function

			const transformFn = createPrebuildLambdaFunction(group, ctx, 'images', id, {
				bundleFile: join(__dirname, '/prebuild/images/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/images/HASH'),
				memorySize: mebibytes(512),
				timeout: seconds(10),
				handler: 'index.default',
				runtime: 'nodejs22.x',
				log: { retention: weeks(2) },
				layers: [layerId],
			})

			new UpdateFunctionCode(group, 'update', {
				version: transformFn.code.sourceHash,

				functionName: transformFn.lambda.functionName,
				architectures: transformFn.lambda.architectures as any,
				s3Bucket: transformFn.lambda.s3Bucket,
				s3Key: transformFn.lambda.s3Key,
				s3ObjectVersion: transformFn.lambda.s3ObjectVersion,
				imageUri: transformFn.lambda.imageUri,
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

			transformFn.setEnvironment(
				'IMAGES_CONFIG',
				JSON.stringify({
					presets: props.presets,
					extensions: props.extensions,
				})
			)

			if (lambdaOrigin) {
				transformFn.setEnvironment('IMAGES_ORIGIN_LAMBDA', lambdaOrigin.name)
			}

			if (s3Origin) {
				transformFn.setEnvironment('IMAGES_ORIGIN_S3', s3Origin.bucket)
				transformFn.addPermission({
					actions: [
						's3:ListBucket',
						's3:ListBucketV2',
						's3:HeadObject',
						's3:GetObject',
						's3:PutObject',
						's3:DeleteObject',
						// 's3:CopyObject',
						's3:GetObjectAttributes',
					],
					resources: [
						//
						s3Origin.arn,
						s3Origin.arn.pipe(arn => `${arn}/*`),
					],
				})
			}

			// ------------------------------------------------------------
			// Upload static images and track versions for invalidation

			const versions: Array<Input<string> | Input<string | undefined>> = []

			ctx.onReady(() => {
				if (props.origin.static && s3Origin) {
					const files = glob.sync('**', {
						cwd: props.origin.static,
						nodir: true,
					})

					for (const file of files) {
						const object = new $.aws.s3.BucketObject(group, `static-${file}`, {
							bucket: s3Origin.bucket,
							key: file,
							cacheControl: 'public, max-age=31536000, immutable',
							contentType: contentType(extname(file)) || `image/${extname(file).slice(1)}`,
							source: join(props.origin.static, file),
							sourceHash: $hash(join(props.origin.static, file)),
						})
						versions.push(object.key)
						versions.push(object.sourceHash)
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

			const accessControl = new $.aws.cloudfront.OriginAccessControl(group, 'access', {
				name,
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
						originId: 'default',
						domainName: transformFnUrl.functionUrl.pipe(url => url.split('/')[2]!),
						originAccessControlId: accessControl.id,
						customOriginConfig: {
							originProtocolPolicy: 'https-only',
							httpPort: 80,
							httpsPort: 443,
							originSslProtocols: ['TLSv1.2'],
						},
					},
				],

				defaultCacheBehavior: {
					compress: true,
					targetOriginId: 'default',
					cachePolicyId: cache.id,
					viewerProtocolPolicy: 'redirect-to-https',
					allowedMethods: ['GET', 'HEAD'],
					cachedMethods: ['GET', 'HEAD'],
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
