import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
import { DurationSchema, durationMin } from '../../config/schema/duration.js'
import { seconds } from '@awsless/duration'

// export const StoresSchema = z.array(ResourceIdSchema).optional().describe('Define the stores in your stack.')

const CorsSchema = z
	.array(
		z.object({
			maxAge: DurationSchema.refine(durationMin(seconds(0)))
				.optional()
				.describe(
					'The time in seconds that your browser is to cache the preflight response for the specified resource.'
				),
			origins: z
				.array(z.string())
				.describe('One or more origins you want customers to be able to access the bucket from.'),
			methods: z
				.array(z.enum(['GET', 'PUT', 'HEAD', 'POST', 'DELETE']))
				.describe('An HTTP method that you allow the origin to run.'),
			headers: z
				.array(z.string())
				.optional()
				.describe(
					'Headers that are specified in the Access-Control-Request-Headers header. These headers are allowed in a preflight OPTIONS request. In response to any preflight OPTIONS request, Amazon S3 returns any requested headers that are allowed.'
				),
			exposeHeaders: z
				.array(z.string())
				.optional()
				.describe(
					'One or more headers in the response that you want customers to be able to access from their applications (for example, from a JavaScript XMLHttpRequest object).'
				),
		})
	)
	.max(100)
	.optional()
	.describe('Describes the AWS Lambda functions to invoke and the events for which to invoke them.')

const LambdaConfigsSchema = z
	.array(
		z.object({
			event: z
				.enum(['created', 'removed'])
				.describe('The Amazon S3 bucket event for which to invoke the AWS Lambda function.'),
			consumer: FunctionSchema.describe('The consuming lambda function properties.'),
		})
	)
	.optional()
	.describe('Describes the AWS Lambda functions to invoke and the events for which to invoke them.')

export const StoresSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			lambdaConfigs: LambdaConfigsSchema,
			cors: CorsSchema,
			versioning: z.boolean().default(false),
		})
	)
	.optional()
	.describe('Define the stores in your stack.')
