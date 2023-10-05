
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { Distribution, Origin, OriginGroup } from '../formation/resource/cloud-front/distribution.js';
import { Bucket } from '../formation/resource/s3/bucket.js';
import { LocalDirectorySchema } from '../schema/local-directory.js';
import { OriginRequestPolicy } from '../formation/resource/cloud-front/origin-request-policy.js';
import { CachePolicy } from '../formation/resource/cloud-front/cache-policy.js';
import { Duration } from '../formation/property/duration.js';
import { lazy, select, split, sub } from '../formation/util.js';
import { RecordSet } from '../formation/resource/route53/record-set.js';
import { Files } from '../formation/resource/s3/files.js';
import { Resource } from '../formation/resource.js';
import { Permission } from '../formation/resource/lambda/permission.js';
import { BucketPolicy } from '../formation/resource/s3/bucket-policy.js';
import { OriginAccessControl } from '../formation/resource/cloud-front/origin-access-control.js';
import { ResponseHeadersPolicy } from '../formation/resource/cloud-front/response-headers-policy.js';
import { DurationSchema } from '../schema/duration.js';
import { CustomResource } from '../formation/resource/cloud-formation/custom-resource.js';

export const sitePlugin = definePlugin({
	name: 'site',
	schema: z.object({
		stacks: z.object({
			/** Define the sites in your stack.
			 * @example
			 * {
			 *   sites: {
			 *     SITE_NAME: {
			 *       static: 'dist/client'
			 *       ssr: 'dist/server/index.js'
			 *     }
			 *   }
			 * }
			 * */
			sites: z.record(
				ResourceIdSchema,
				z.object({
					/** The domain to link your site with. */
					domain: z.string(),
					subDomain: z.string().optional(),

					/** Specifies the path to the static files directory. */
					static: LocalDirectorySchema.optional(),

					/** Specifies the ssr file. */
					ssr: FunctionSchema.optional(),

					/** Define the cors headers. */
					cors: z.object({
						override: z.boolean().default(false),
						maxAge: DurationSchema.default('365 days'),
						exposeHeaders: z.string().array().optional(),
						credentials: z.boolean().default(false),
						headers: z.string().array().default([ '*' ]),
						origins: z.string().array().default([ '*' ]),
						methods: z.enum(['GET', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'ALL']).array().default([ 'ALL' ]),
					}).optional(),

					/** Define the cors headers. */
					security: z.object({
						// contentSecurityPolicy: z.object({
						// 	override: z.boolean().default(false),
						// 	policy: z.string(),
						// })
						// contentSecurityPolicy?: {
						// 	override?: boolean
						// 	contentSecurityPolicy: string
						// }
						// contentTypeOptions?: {
						// 	override?: boolean
						// }
						// frameOptions?: {
						// 	override?: boolean
						// 	frameOption?: 'deny' | 'same-origin'
						// }
						// referrerPolicy?: {
						// 	override?: boolean
						// 	referrerPolicy?: (
						// 		'no-referrer' |
						// 		'no-referrer-when-downgrade' |
						// 		'origin' |
						// 		'origin-when-cross-origin' |
						// 		'same-origin' |
						// 		'strict-origin' |
						// 		'strict-origin-when-cross-origin' |
						// 		'unsafe-url'
						// 	)
						// }
						// strictTransportSecurity?: {
						// 	maxAge?: Duration
						// 	includeSubdomains?: boolean
						// 	override?: boolean
						// 	preload?: boolean
						// }
						// xssProtection?: {
						// 	override?: boolean
						// 	enable?: boolean
						// 	modeBlock?: boolean
						// 	reportUri?: string
						// }
					}).optional(),

					/** Specifies the cookies, headers, and query values that CloudFront includes in the cache key. */
					cache: z.object({
						/** Specifies the cookies that CloudFront includes in the cache key. */
						cookies: z.string().array().optional(),
						/** Specifies the headers that CloudFront includes in the cache key. */
						headers: z.string().array().optional(),
						/** Specifies the query values that CloudFront includes in the cache key. */
						queries: z.string().array().optional(),
					}).optional()
				})
			).optional()
		}).array()
	}),
	onStack(ctx) {
		const { config, stack, stackConfig, bootstrap } = ctx

		for(const [ id, props ] of Object.entries(stackConfig.sites || {})) {
			const origins:Origin[] = []
			const originGroups:OriginGroup[] = []
			const deps:Resource[] = []

			let bucket: Bucket

			if(props.ssr) {
				const lambda = toLambdaFunction(ctx as any, `site-${id}`, props.ssr)
				const permissions = new Permission(`site-${id}`, {
					principal: '*',
					// principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunctionUrl',
					functionArn: lambda.arn,
					urlAuthType: 'none',
					// sourceArn: distribution.arn,
				}).dependsOn(lambda)

				const url = lambda.addUrl()

				stack.add(url, lambda, permissions)

				origins.push(new Origin({
					id: 'lambda',
					domainName: select(2, split('/', url.url)),
					protocol: 'https-only',
				}))

				deps.push(lambda, url, permissions)
			}

			if(props.static) {
				bucket = new Bucket(`site-${id}`, {
					// name: props.domain,
					name: `site-${config.name}-${stack.name}-${id}`,
					accessControl: 'private',
					website: {
						indexDocument: 'index.html',
						errorDocument: props.ssr ? undefined : 'error.html'
					}
				})

				const accessControl = new OriginAccessControl(`site-${id}`, {
					type: 's3'
				})

				const files = new Files(`site-${id}`, {
					directory: props.static,
				})

				const uploadBucketAsset = new CustomResource(`site-${id}-upload-bucket-asset`, {
					serviceToken: bootstrap.import('feature-upload-bucket-asset'),
					properties: {
						sourceBucketName: lazy(() => files.source?.bucket ?? ''),
						sourceObjectKey: lazy(() => files.source?.key ?? ''),
						sourceObjectVersion: lazy(() => files.source?.version ?? ''),
						destinationBucketName: bucket.name,
					}
				}).dependsOn(bucket)

				const deleteBucket = new CustomResource(id, {
					serviceToken: bootstrap.import('feature-delete-bucket'),
					properties: {
						bucketName: bucket.name,
					}
				}).dependsOn(bucket)

				stack.add(bucket, files, uploadBucketAsset, deleteBucket, accessControl)

				origins.push(new Origin({
					id: 'bucket',
					// domainName: select(2, split('/', bucket.url)),
					domainName: bucket.domainName,
					originAccessControlId: accessControl.id,
				}))

				deps.push(bucket, accessControl)
			}

			if(props.ssr && props.static) {
				originGroups.push(new OriginGroup({
					id: 'group',
					members: [ 'lambda', 'bucket' ],
					statusCodes: [ 403, 404 ]
				}))
			}

			const cache = new CachePolicy(id, {
				name: `site-${config.name}-${stack.name}-${id}`,
				minTtl: Duration.seconds(1),
				maxTtl: Duration.days(365),
				defaultTtl: Duration.days(1),
				...props.cache,
			})

			const originRequest = new OriginRequestPolicy(id, {
				name: `site-${config.name}-${stack.name}-${id}`,
				header: {
					behavior: 'all-except',
					values: [ 'HOST' ],
				}
			})

			const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain
			const hostedZoneId = bootstrap.import(`hosted-zone-${props.domain}-id`)
			const certificateArn = bootstrap.import(`us-east-certificate-${props.domain}-arn`)
			const responseHeaders = new ResponseHeadersPolicy(id, {
				name: `site-${config.name}-${stack.name}-${id}`,
				cors: props.cors,
				remove: [ 'server' ]
			})

			const distribution = new Distribution(id, {
				name: `site-${config.name}-${stack.name}-${id}`,
				certificateArn,
				compress: true,
				aliases: [ domainName ],
				origins,
				originGroups,
				targetOriginId: props.ssr && props.static ? 'group' : props.ssr ? 'lambda' : 'bucket',
				originRequestPolicyId: originRequest.id,
				cachePolicyId: cache.id,
				responseHeadersPolicyId: responseHeaders.id,
			}).dependsOn(originRequest, responseHeaders, cache, ...deps)

			if(props.static) {
				const bucketPolicy = new BucketPolicy(`site-${id}`, {
					bucketName: bucket!.name,
					statements: [
						{
							principal: 'cloudfront.amazonaws.com',
							actions: [ 's3:GetObject' ],
							resources: [ sub('${arn}/*', { arn: bucket!.arn }) ],
							sourceArn: distribution.arn,
						},
						// {
						// 	principal: distribution.id,
						// 	actions: [ 's3:GetObject' ],
						// 	resources: [ oac.attrId ]
						// }
					]
				}).dependsOn(bucket!, distribution)

				stack.add(bucketPolicy)
			}

			const record = new RecordSet(`site-${id}`, {
				hostedZoneId,
				type: 'A',
				name: domainName,
				alias: {
					dnsName: distribution.domainName,
					hostedZoneId: 'Z2FDTNDATAQYW2',
				}
			}).dependsOn(distribution)

			stack.add(
				distribution,
				responseHeaders,
				originRequest,
				cache,
				record
			)
		}
	},
})
