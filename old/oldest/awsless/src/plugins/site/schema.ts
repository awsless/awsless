import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { DurationSchema } from '../../config/schema/duration.js'

const ErrorResponsePathSchema = z
	.string()
	.describe(
		"The path to the custom error page that you want to return to the viewer when your origin returns the HTTP status code specified.\n - We recommend that you store custom error pages in an Amazon S3 bucket. If you store custom error pages on an HTTP server and the server starts to return 5xx errors, CloudFront can't get the files that you want to return to viewers because the origin server is unavailable."
	)

const StatusCodeSchema = z
	.number()
	.int()
	.positive()
	.optional()
	.describe(
		"The HTTP status code that you want CloudFront to return to the viewer along with the custom error page. There are a variety of reasons that you might want CloudFront to return a status code different from the status code that your origin returned to CloudFront, for example:\n- Some Internet devices (some firewalls and corporate proxies, for example) intercept HTTP 4xx and 5xx and prevent the response from being returned to the viewer. If you substitute 200, the response typically won't be intercepted.\n- If you don't care about distinguishing among different client errors or server errors, you can specify 400 or 500 as the ResponseCode for all 4xx or 5xx errors.\n- You might want to return a 200 status code (OK) and static website so your customers don't know that your website is down."
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
			domain: ResourceIdSchema.describe('The domain id to link your site with.'),
			subDomain: z.string().optional(),

			static: LocalDirectorySchema.optional().describe('Specifies the path to the static files directory.'),
			ssr: FunctionSchema.optional().describe('Specifies the ssr file.'),

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
				.describe('Define the cors headers.'),

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
				.describe('Define the security policy.'),

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
