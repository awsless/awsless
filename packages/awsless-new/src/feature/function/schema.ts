import { z } from 'zod'
import { DurationSchema, durationMax, durationMin } from '../../config/schema/duration.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { SizeSchema, sizeMax, sizeMin } from '../../config/schema/size.js'
import { days, minutes, seconds } from '@awsless/duration'
import { gibibytes, mebibytes } from '@awsless/size'

const MemorySizeSchema = SizeSchema.refine(sizeMin(mebibytes(128)), 'Minimum memory size is 128 MB')
	.refine(sizeMax(gibibytes(10)), 'Maximum memory size is 10 GB')
	.describe(
		'The amount of memory available to the function at runtime. Increasing the function memory also increases its CPU allocation. The value can be any multiple of 1 MB. You can specify a size value from 128 MB to 10 GB.'
	)

const TimeoutSchema = DurationSchema.refine(durationMin(seconds(10)), 'Minimum timeout duration is 10 seconds')
	.refine(durationMax(minutes(15)), 'Maximum timeout duration is 15 minutes')
	.describe(
		'The amount of time that Lambda allows a function to run before stopping it. You can specify a size value from 1 second to 15 minutes.'
	)

const EphemeralStorageSizeSchema = SizeSchema.refine(
	sizeMin(mebibytes(512)),
	'Minimum ephemeral storage size is 512 MB'
)
	.refine(sizeMax(gibibytes(10)), 'Minimum ephemeral storage size is 10 GB')
	.describe("The size of the function's /tmp directory. You can specify a size value from 512 MB to 10 GB.")

const ReservedConcurrentExecutionsSchema = z
	.number()
	.int()
	.min(0)
	.describe(
		'The number of simultaneous executions to reserve for the function. You can specify a number from 0.'
	)

const EnvironmentSchema = z
	.record(z.string(), z.string())
	.optional()
	.describe('Environment variable key-value pairs.')

const ArchitectureSchema = z
	.enum(['x86_64', 'arm64'])
	.describe('The instruction set architecture that the function supports.')

const RetryAttemptsSchema = z
	.number()
	.int()
	.min(0)
	.max(2)
	.describe(
		'The maximum number of times to retry when the function returns an error. You can specify a number from 0 to 2.'
	)

const RuntimeSchema = z.enum(['nodejs18.x', 'nodejs20.x']).describe("The identifier of the function's runtime.")

const ActionSchema = z.string()
const ActionsSchema = z.union([ActionSchema.transform(v => [v]), ActionSchema.array()])

const ArnSchema = z.string().startsWith('arn:')
const WildcardSchema = z.literal('*')

const ResourceSchema = z.union([ArnSchema, WildcardSchema]).transform(v => v as `arn:${string}`)
const ResourcesSchema = z.union([ResourceSchema.transform(v => [v]), ResourceSchema.array()])

const PermissionSchema = z.object({
	effect: z.enum(['allow', 'deny']).default('allow'),
	actions: ActionsSchema,
	resources: ResourcesSchema,
})

const PermissionsSchema = z
	.union([PermissionSchema.transform(v => [v]), PermissionSchema.array()])
	.describe('Add IAM permissions to your function.')

const WarmSchema = z
	.number()
	.int()
	.min(0)
	.max(10)
	.describe(
		'Specify how many functions you want to warm up each 5 minutes. You can specify a number from 0 to 10.'
	)

const VPCSchema = z.boolean().describe('Put the function inside your global VPC.')

const MinifySchema = z.boolean().describe('Minify the function code.')

const HandlerSchema = z
	.string()
	.describe('The name of the exported method within your code that Lambda calls to run your function.')

const FileSchema = LocalFileSchema.describe('The file path of the function code.')

const DescriptionSchema = z.string().describe('A description of the function.')

const LogRetentionSchema = DurationSchema.refine(
	durationMin(days(0)),
	'Minimum log retention is 0 day, which will disable logging.'
)

const LogSchema = z
	.union([
		z.boolean().transform(enabled => ({ retention: enabled ? days(7) : days(0) })),
		LogRetentionSchema.transform(retention => ({ retention })),
		z.object({
			retention: LogRetentionSchema.describe('The log retention duration.'),
			format: z
				.enum(['text', 'json'])
				.describe(
					`The format in which Lambda sends your function's application and system logs to CloudWatch. Select between plain text and structured JSON.`
				)
				.optional(),
			system: z
				.enum(['debug', 'info', 'warn'])
				.describe(
					'Set this property to filter the system logs for your function that Lambda sends to CloudWatch. Lambda only sends system logs at the selected level of detail and lower, where DEBUG is the highest level and WARN is the lowest.'
				)
				.optional(),
			level: z
				.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
				.describe(
					'Set this property to filter the application logs for your function that Lambda sends to CloudWatch. Lambda only sends application logs at the selected level of detail and lower, where TRACE is the highest level and FATAL is the lowest.'
				)
				.optional(),
		}),
	])
	.describe(
		'Enable logging to a CloudWatch log group. Providing a duration value will set the log retention time.'
	)

export const FunctionSchema = z.union([
	LocalFileSchema.transform(file => ({
		file,
	})),
	z.object({
		file: FileSchema,
		description: DescriptionSchema.optional(),
		handler: HandlerSchema.optional(),
		minify: MinifySchema.optional(),
		warm: WarmSchema.optional(),
		vpc: VPCSchema.optional(),
		log: LogSchema.optional(),
		timeout: TimeoutSchema.optional(),
		runtime: RuntimeSchema.optional(),
		memorySize: MemorySizeSchema.optional(),
		architecture: ArchitectureSchema.optional(),
		ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),
		retryAttempts: RetryAttemptsSchema.optional(),
		reserved: ReservedConcurrentExecutionsSchema.optional(),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
	}),
])

export const FunctionsSchema = z
	.record(ResourceIdSchema, FunctionSchema)
	.optional()
	.describe('Define the functions in your stack.')

export const FunctionDefaultSchema = z
	.object({
		handler: HandlerSchema.default('index.default'),
		minify: MinifySchema.default(true),
		warm: WarmSchema.default(0),
		vpc: VPCSchema.default(false),
		log: LogSchema.default({
			retention: '7 days',
			level: 'error',
			system: 'warn',
			format: 'json',
		}),
		timeout: TimeoutSchema.default('10 seconds'),
		runtime: RuntimeSchema.default('nodejs20.x'),
		memorySize: MemorySizeSchema.default('128 MB'),
		architecture: ArchitectureSchema.default('arm64'),
		ephemeralStorageSize: EphemeralStorageSizeSchema.default('512 MB'),
		retryAttempts: RetryAttemptsSchema.default(2),
		reserved: ReservedConcurrentExecutionsSchema.optional(),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
	})
	.default({})
