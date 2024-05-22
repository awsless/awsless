import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
// import { DurationSchema, durationMin } from '../../config/schema/duration.js'
// import { seconds } from '@awsless/duration'

// const CorsSchema = z
// 	.array(
// 		z.object({
// 			maxAge: DurationSchema.refine(durationMin(seconds(0)))
// 				.optional()
// 				.describe(
// 					'The time in seconds that your browser is to cache the preflight response for the specified resource.'
// 				),
// 			origins: z
// 				.array(z.string())
// 				.describe('One or more origins you want customers to be able to access the bucket from.'),
// 			methods: z
// 				.array(z.enum(['GET', 'PUT', 'HEAD', 'POST', 'DELETE']))
// 				.describe('An HTTP method that you allow the origin to run.'),
// 			headers: z
// 				.array(z.string())
// 				.optional()
// 				.describe(
// 					'Headers that are specified in the Access-Control-Request-Headers header. These headers are allowed in a preflight OPTIONS request. In response to any preflight OPTIONS request, Amazon S3 returns any requested headers that are allowed.'
// 				),
// 			exposeHeaders: z
// 				.array(z.string())
// 				.optional()
// 				.describe(
// 					'One or more headers in the response that you want customers to be able to access from their applications (for example, from a JavaScript XMLHttpRequest object).'
// 				),
// 		})
// 	)
// 	.max(100)
// 	.optional()
// 	.describe('Describes the AWS Lambda functions to invoke and the events for which to invoke them.')

export const StoresSchema = z
	.union([
		z.array(ResourceIdSchema).transform(list => {
			const stores: Record<
				string,
				{
					versioning?: boolean
					events?: Record<string, z.output<typeof FunctionSchema>>
				}
			> = {}

<<<<<<< HEAD
			for (const key in list) {
=======
			for (const key of list) {
>>>>>>> 5e9190592352fbd365a34329ff1be43765283914
				stores[key] = {}
			}

			return stores
		}),
		z.record(
			ResourceIdSchema,
			z.object({
				// cors: CorsSchema,
				versioning: z.boolean().default(false).describe('Enable versioning of your store.'),
				events: z
					.object({
						// create
						'created:*': FunctionSchema.optional().describe(
							'Subscribe to notifications regardless of the API that was used to create an object.'
						),
						'created:put': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is created using the PUT API operation.'
						),
						'created:post': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is created using the POST API operation.'
						),
						'created:copy': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is created using the COPY API operation.'
						),
						'created:upload': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object multipart upload has been completed.'
						),

						// remove
						'removed:*': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is deleted or a delete marker for a versioned object is created.'
						),
						'removed:delete': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is deleted'
						),
						'removed:marker': FunctionSchema.optional().describe(
							'Subscribe to notifications when a delete marker for a versioned object is created.'
						),
					})
					.optional()
					.describe('Describes the store events you want to subscribe too.'),
			})
		),
	])
	.optional()
	.describe('Define the stores in your stack.')
