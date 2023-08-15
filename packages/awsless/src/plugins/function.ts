
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
		file: LocalFileSchema,
		timeout: TimeoutSchema.optional(),
		runtime: RuntimeSchema.optional(),
		memorySize: MemorySizeSchema.optional(),
		architecture: ArchitectureSchema.optional(),
		ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),
		retryAttempts: RetryAttemptsSchema.optional(),
		environment: EnvironmentSchema.optional(),
	})
])

const schema = z.object({
	defaults: z.object({
		function: z.object({
			timeout: TimeoutSchema.default('10 seconds'),
			runtime: RuntimeSchema.default('nodejs18.x'),
			memorySize: MemorySizeSchema.default('128 MB'),
			architecture: ArchitectureSchema.default('arm64'),
			ephemeralStorageSize: EphemeralStorageSizeSchema.default('512 MB'),
			retryAttempts: RetryAttemptsSchema.default(2),
			environment: EnvironmentSchema.optional(),
		}).default({}),
	}).default({}),
	stacks: z.object({
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
		for(const [ id, props ] of Object.entries(ctx.stackConfig.functions || {})) {
			const lambda = toLambdaFunction(ctx, id, props)
			ctx.stack.add(lambda)
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

	lambda.addEnvironment('APP', config.name)
	lambda.addEnvironment('STAGE', config.stage)
	lambda.addEnvironment('STACK', stack.name)

	if (props.runtime.startsWith('nodejs')) {
		lambda.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1')
	}

	return lambda
}
