
import { ExtendedConfigOutput, StackContext, definePlugin } from '../plugin.js';
import { z } from 'zod'
import { DurationSchema, durationMax, durationMin } from '../schema/duration.js';
import { LocalFileSchema } from '../schema/local-file.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { SizeSchema, sizeMax, sizeMin } from '../schema/size.js';
import { Function } from '../formation/resource/lambda/function.js';
import { Duration } from '../formation/property/duration.js';
import { Size } from '../formation/property/size.js';
import { Code } from '../formation/resource/lambda/code.js';
import { EventInvokeConfig } from '../formation/resource/lambda/event-invoke-config.js';
import { getGlobalOnFailure } from './on-failure/util.js';

const MemorySizeSchema = SizeSchema
	.refine(sizeMin(Size.megaBytes(128)), 'Minimum memory size is 128 MB')
	.refine(sizeMax(Size.gigaBytes(10)), 'Minimum memory size is 10 GB')

const TimeoutSchema = DurationSchema
	.refine(durationMin(Duration.seconds(10)), 'Minimum timeout duration is 10 seconds')
	.refine(durationMax(Duration.minutes(15)), 'Maximum timeout duration is 15 minutes')

const EphemeralStorageSizeSchema = SizeSchema
	.refine(sizeMin(Size.megaBytes(512)), 'Minimum ephemeral storage size is 512 MB')
	.refine(sizeMax(Size.gigaBytes(10)), 'Minimum ephemeral storage size is 10 GB')

const EnvironmentSchema = z.record(z.string(), z.string()).optional()
const ArchitectureSchema = z.enum([ 'x86_64', 'arm64' ])
const RetryAttemptsSchema = z.number().int().min(0).max(2)
const RuntimeSchema = z.enum([
	'nodejs16.x',
	'nodejs18.x',
])

export const FunctionSchema = z.union([
	LocalFileSchema,
	z.object({
		/** The file path ofthe function code. */
		file: LocalFileSchema,

		/** The amount of time that Lambda allows a function to run before stopping it.
		 * You can specify a size value from 1 second to 15 minutes.
		 * @default '10 seconds'
		 */
		timeout: TimeoutSchema.optional(),

		/** The identifier of the function's runtime.
		 * @default 'nodejs18.x'
		 */
		runtime: RuntimeSchema.optional(),

		/** The amount of memory available to the function at runtime.
		 * Increasing the function memory also increases its CPU allocation.
		 * The value can be any multiple of 1 MB.
		 * You can specify a size value from 128 MB to 10 GB.
		 * @default '128 MB'
		 */
		memorySize: MemorySizeSchema.optional(),

		/** The instruction set architecture that the function supports.
		 * @default 'arm64'
		 */
		architecture: ArchitectureSchema.optional(),

		/** The size of the function's /tmp directory.
		 * You can specify a size value from 512 MB to 10 GB.
		 * @default 512 MB
		*/
		ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),

		/** The maximum number of times to retry when the function returns an error.
		 * You can specify a number from 0 to 2.
		 * @default 2
		*/
		retryAttempts: RetryAttemptsSchema.optional(),

		/** Environment variable key-value pairs.
		 * @example
		 * {
		 *   environment: {
		 *     name: 'value'
		 *   }
		 * }
		 */
		environment: EnvironmentSchema.optional(),

		// onFailure: ResourceIdSchema.optional(),
	})
])

const schema = z.object({
	defaults: z.object({
		function: z.object({
			/** The amount of time that Lambda allows a function to run before stopping it.
			 * You can specify a size value from 1 second to 15 minutes.
			 * @default '10 seconds'
			 */
			timeout: TimeoutSchema.default('10 seconds'),

			/** The identifier of the function's runtime.
			 * @default 'nodejs18.x'
			 */
			runtime: RuntimeSchema.default('nodejs18.x'),

			/** The amount of memory available to the function at runtime.
			 * Increasing the function memory also increases its CPU allocation.
			 * The value can be any multiple of 1 MB.
			 * You can specify a size value from 128 MB to 10 GB.
			 * @default '128 MB'
			 */
			memorySize: MemorySizeSchema.default('128 MB'),

			/** The instruction set architecture that the function supports.
			 * @default 'arm64'
			 */
			architecture: ArchitectureSchema.default('arm64'),

			/** The size of the function's /tmp directory.
			 * You can specify a size value from 512 MB to 10 GB.
			 * @default 512 MB
			*/
			ephemeralStorageSize: EphemeralStorageSizeSchema.default('512 MB'),

			/** The maximum number of times to retry when the function returns an error.
			 * You can specify a number from 0 to 2.
			 * @default 2
			*/
			retryAttempts: RetryAttemptsSchema.default(2),

			/** Environment variable key-value pairs.
			 * @example
			 * {
			 *   environment: {
			 *     name: 'value'
			 *   }
			 * }
			 */
			environment: EnvironmentSchema.optional(),

			// onFailure: ResourceIdSchema.optional(),
		}).default({}),
	}).default({}),
	stacks: z.object({
		/** Define the functions in your stack.
		 * @example
		 * {
		 *   functions: {
		 *     FUNCTION_NAME: 'function.ts'
		 *   }
		 * }
		 */
		functions: z.record(
			ResourceIdSchema,
			FunctionSchema,
		).optional()
	}).array()
})

export const functionPlugin = definePlugin({
	name: 'function',
	schema,
	onStack(ctx) {
		const { config, stack } = ctx

		for(const [ id, fileOrProps ] of Object.entries(ctx.stackConfig.functions || {})) {
			const props = typeof fileOrProps === 'string'
				? { ...config.defaults?.function, file: fileOrProps }
				: { ...config.defaults?.function, ...fileOrProps }

			const lambda = toLambdaFunction(ctx, id, fileOrProps)

			const invoke = new EventInvokeConfig(id, {
				functionName: lambda.name,
				retryAttempts: props.retryAttempts,
				onFailure: getGlobalOnFailure(ctx),
			}).dependsOn(lambda)

			stack.add(invoke, lambda)
		}
	},
})

export const toLambdaFunction = (
	ctx: StackContext,
	id: string,
	fileOrProps:z.infer<typeof FunctionSchema>
) => {
	const config = ctx.config as ExtendedConfigOutput<typeof schema>
	const stack = ctx.stack

	const props = typeof fileOrProps === 'string'
		? { ...config.defaults?.function, file: fileOrProps }
		: { ...config.defaults?.function, ...fileOrProps }

	const lambda = new Function(id, {
		name: `${config.name}-${stack.name}-${id}`,
		code: Code.fromFile(id, props.file),
		...props,
	})

	lambda
		.addEnvironment('APP', config.name)
		.addEnvironment('STAGE', config.stage)
		.addEnvironment('STACK', stack.name)

	if (props.runtime.startsWith('nodejs')) {
		lambda.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1')
	}

	return lambda
}
