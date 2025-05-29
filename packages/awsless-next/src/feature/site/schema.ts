import { z } from 'zod'
import { DurationSchema } from '../../config/schema/duration.js'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { LocalEntrySchema } from '../../config/schema/local-entry.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const ErrorResponsePathSchema = z
	.string()
	.describe(
		[
			'The path to the custom error page that you want to return to the viewer when your origin returns the HTTP status code specified.',
			'- We recommend that you store custom error pages in an Amazon S3 bucket.',
			"If you store custom error pages on an HTTP server and the server starts to return 5xx errors, CloudFront can't get the files that you want to return to viewers because the origin server is unavailable.",
		].join('\n')
	)

const StatusCodeSchema = z
	.number()
	.int()
	.positive()
	.optional()
	.describe(
		[
			'The HTTP status code that you want CloudFront to return to the viewer along with the custom error page.',
			'There are a variety of reasons that you might want CloudFront to return a status code different from the status code that your origin returned to CloudFront, for example:',
			'- Some Internet devices (some firewalls and corporate proxies, for example) intercept HTTP 4xx and 5xx and prevent the response from being returned to the viewer.',
			"If you substitute 200, the response typically won't be intercepted.",
			`- If you don't care about distinguishing among different client errors or server errors, you can specify 400 or 500 as the ResponseCode for all 4xx or 5xx errors.`,
			`- You might want to return a 200 status code (OK) and static website so your customers don't know that your website is down.`,
		].join('\n')
	)

const MinTTLSchema = DurationSchema.describe(
	'The minimum amount of time, that you want to cache the error response. When this time period has elapsed, CloudFront queries your origin to see whether the problem that caused the error has been resolved and the requested object is now available.'
)

const ErrorResponseSchema = z
	.union([
		ErrorResponsePathSchema,
		z.object({
			path: ErrorResponsePathSchema,
			statusCode: StatusCodeSchema.optional(),
			minTTL: MinTTLSchema.optional(),
		}),
	])
	.optional()

export const SitesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your site with.').optional(),
			subDomain: z.string().optional(),

			// bind: z
			// 	.object({
			// 		auth: z.array(ResourceIdSchema),
			// 		graphql: z.array(ResourceIdSchema),
			// 		// http: z.array(ResourceIdSchema),
			// 		// rest: z.array(ResourceIdSchema),
			// 	})
			// 	.optional(),

			build: z
				.object({
					command: z
						.string()
						.describe(
							`Specifies the files and directories to generate the cache key for your custom build command.`
						),
					cacheKey: z
						.union([LocalEntrySchema.transform(v => [v]), LocalEntrySchema.array()])
						.describe(
							`Specifies the files and directories to generate the cache key for your custom build command.`
						),
				})
				.optional()
				.describe(`Specifies the build process for sites that need a build step.`),

			static: z
				.union([LocalDirectorySchema, z.boolean()])
				.optional()
				.describe(
					"Specifies the path to the static files directory. Additionally you can also pass `true` when you don't have local static files, but still want to make an S3 bucket."
				),

			ssr: FunctionSchema.optional().describe('Specifies the file that will render the site on the server.'),

			// envPrefix: z.string().optional().describe('Specifies a prefix for all '),

			// origin: z
			// 	.enum(['ssr-first', 'static-first'])
			// 	.default('static-first')
			// 	.describe('Specifies the origin fallback ordering.'),

			// bind: z.object({
			// 	auth:
			// 	h
			// }).optional(),

			// ssr: z.union([
			// 	FunctionSchema.optional(),
			// 	z.object({
			// 		consumer: FunctionSchema.optional(),
			// 		responseStreaming: z.boolean().default(false),
			// 		build: z.string().optional(),
			// 	}),
			// ]),

			geoRestrictions: z
				.array(z.string().length(2).toUpperCase())
				.default([])
				.describe('Specifies a blacklist of countries that should be blocked.'),

			// forwardHost: z
			// 	.boolean()
			// 	.default(false)
			// 	.describe(
			// 		[
			// 			'Specify if the original `host` header should be forwarded to the SSR function.',
			// 			'The original `host` header will be forwarded as `x-forwarded-host`.',
			// 			'Keep in mind that this requires an extra CloudFront Function.',
			// 		].join('\n')
			// 	),

			errors: z
				.object({
					400: ErrorResponseSchema.describe('Customize a `400 Bad Request` response.'),
					403: ErrorResponseSchema.describe('Customize a `403 Forbidden` response.'),
					404: ErrorResponseSchema.describe('Customize a `404 Not Found` response.'),
					405: ErrorResponseSchema.describe('Customize a `405 Method Not Allowed` response.'),
					414: ErrorResponseSchema.describe('Customize a `414 Request-URI` response.'),
					416: ErrorResponseSchema.describe('Customize a `416 Range Not` response.'),
					500: ErrorResponseSchema.describe('Customize a `500 Internal Server` response.'),
					501: ErrorResponseSchema.describe('Customize a `501 Not Implemented` response.'),
					502: ErrorResponseSchema.describe('Customize a `502 Bad Gateway` response.'),
					503: ErrorResponseSchema.describe('Customize a `503 Service Unavailable` response.'),
					504: ErrorResponseSchema.describe('Customize a `504 Gateway Timeout` response.'),
				})
				.optional()
				.describe('Customize the error responses for specific HTTP status codes.'),

			cors: z
				.object({
					override: z.boolean().default(false),
					maxAge: DurationSchema.default('365 days'),
					exposeHeaders: z.string().array().optional(),
					credentials: z.boolean().default(false),
					headers: z.string().array().default(['*']),
					origins: z.string().array().default(['*']),
					methods: z
						.enum(['GET', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'ALL'])
						.array()
						.default(['ALL']),
				})
				.optional()
				.describe('Specify the cors headers.'),

			security: z
				.object({
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
				})
				.optional()
				.describe('Specify the security policy.'),

			cache: z
				.object({
					cookies: z
						.string()
						.array()
						.optional()
						.describe('Specifies the cookies that CloudFront includes in the cache key.'),
					headers: z
						.string()
						.array()
						.optional()
						.describe('Specifies the headers that CloudFront includes in the cache key.'),
					queries: z
						.string()
						.array()
						.optional()
						.describe('Specifies the query values that CloudFront includes in the cache key.'),
				})
				.optional()
				.describe(
					'Specifies the cookies, headers, and query values that CloudFront includes in the cache key.'
				),
		})
	)
	.optional()
	.describe('Define the sites in your stack.')
