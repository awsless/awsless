import { days, minutes, seconds, toDays } from '@awsless/duration'
import { gibibytes, mebibytes } from '@awsless/size'
import { z } from 'zod'
import { durationMax, durationMin, DurationSchema } from '../../config/schema/duration.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { RelativePathSchema } from '../../config/schema/relative-path.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { sizeMax, sizeMin, SizeSchema } from '../../config/schema/size.js'

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
	.describe('The number of simultaneous executions to reserve for the function. You can specify a number from 0.')

const VPCSchema = z.boolean().describe('Put the function inside your global VPC.')

const DescriptionSchema = z.string().describe('A description of the function.')

const LayersSchema = z
	.string()
	.array()
	.describe(
		`A list of function layers to add to the function's execution environment. Specify each layer by its name.`
	)

const SandboxRouteSchema = z
	.string()
	.regex(/^[a-z0-9-]+:[a-z0-9-]+$/i, 'Invalid route. Use the "stack:name" format.')

const SandboxSchema = z
	.union([
		z.boolean(),
		z
			.object({
				functions: SandboxRouteSchema.array()
					.optional()
					.describe('The "stack:name" functions the sandbox may invoke through the sandbox proxy.'),
				tasks: SandboxRouteSchema.array()
					.optional()
					.describe('The "stack:name" tasks the sandbox may start through the sandbox proxy.'),
				configs: z.string().array().optional().describe('The config values the sandbox may read.'),
			})
			.strict(),
	])
	.describe(
		'Block the function from invoking other lambdas & reading the app wide env. Pass an object with functions, tasks & configs to allow only those through.'
	)

const EnvironmentSchema = z.record(z.string(), z.string()).optional().describe('Environment variable key-value pairs.')

const ArchitectureSchema = z
	.enum(['x86_64', 'arm64'])
	.describe('The instruction set architecture that the function supports.')

const RuntimeSchema = z
	.enum(['nodejs18.x', 'nodejs20.x', 'nodejs22.x', 'nodejs24.x'])
	.or(z.literal('container'))
	.or(z.string())
	.describe("The identifier of the function's runtime.")

const ActionSchema = z.string()
const ActionsSchema = z.union([ActionSchema.transform(v => [v]), ActionSchema.array()])

const ArnSchema = z.string().startsWith('arn:')
const WildcardSchema = z.literal('*')

const ResourceSchema = z.union([ArnSchema, WildcardSchema])
const ResourcesSchema = z.union([ResourceSchema.transform(v => [v]), ResourceSchema.array()])

const PermissionSchema = z.object({
	effect: z.enum(['allow', 'deny']).default('allow'),
	actions: ActionsSchema,
	resources: ResourcesSchema,
})

const PermissionsSchema = z
	.union([PermissionSchema.transform(v => [v]), PermissionSchema.array()])
	.describe('Add IAM permissions to your function.')

const MinifySchema = z.boolean().describe('Minify the function code.')

const HandlerSchema = z
	.string()
	.describe('The name of the exported method within your code that Lambda calls to run your function.')

const validLogRetentionDays = [
	...[1, 3, 5, 7, 14, 30, 60, 90, 120, 150],
	...[180, 365, 400, 545, 731, 1096, 1827, 2192],
	...[2557, 2922, 3288, 3653],
]

const LogRetentionSchema = DurationSchema.refine(
	durationMin(days(0)),
	'Minimum log retention is 0 day, which will disable logging.'
)
	.refine(
		duration => {
			return validLogRetentionDays.includes(toDays(duration))
		},
		`Invalid log retention. Valid days are: ${validLogRetentionDays.map(days => `${days}`).join(', ')}`
	)
	.describe('The log retention duration.')

const LogSchema = z
	.union([
		z.boolean().transform(enabled => ({ retention: enabled ? days(7) : days(0) })),
		LogRetentionSchema.transform(retention => ({ retention })),
		z.object({
			retention: LogRetentionSchema.optional(),
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
	.describe('Enable logging to a CloudWatch log group. Providing a duration value will set the log retention time.')

const FileCodeSchema = z.object({
	file: LocalFileSchema.describe('The file path of the function code.'),
	minify: MinifySchema.optional().default(true),
	moduleSideEffects: RelativePathSchema.array()
		.default([])
		.describe(
			`A list of glob patterns for modules that should be flagged as having potential side effects. For example "./.svelte-kit/**" will flag every file inside the .svelte-kit folder.`
		),
	external: z
		.string()
		.array()
		.optional()
		.describe(`A list of external packages that won't be included in the bundle.`),
	importAsString: z
		.string()
		.array()
		.optional()
		.describe(`A list of glob patterns, which specifies the files that should be imported as string.`),
})

const CodeSchema = z
	.union([
		LocalFileSchema.transform(file => ({
			file,
		})).pipe(FileCodeSchema),
		FileCodeSchema,
	])
	.describe('Specify the code of your function.')

// The lambda config is defined by the shared bundle, so environment,
// permissions & memorySize live in defaults.function.
const FnSchema = z
	.object({
		code: CodeSchema,
		handler: HandlerSchema.optional(),
	})
	.strict()

export type FunctionProps = z.output<typeof FnSchema>

export const FunctionSchema = z.union([
	LocalFileSchema.transform(code => ({
		code,
	})).pipe(FnSchema),
	FnSchema,
])

// The rich per-function schema for stack functions. Setting any of the
// lambda infra fields deploys the function as its own stand-alone lambda
// instead of registering it inside the shared bundle.
const StackFnSchema = z
	.object({
		code: CodeSchema,
		handler: HandlerSchema.optional(),

		runtime: RuntimeSchema.optional(),
		description: DescriptionSchema.optional(),
		vpc: VPCSchema.optional(),
		log: LogSchema.optional(),
		timeout: TimeoutSchema.optional(),
		memorySize: MemorySizeSchema.optional(),
		architecture: ArchitectureSchema.optional(),
		ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),
		reserved: ReservedConcurrentExecutionsSchema.optional(),
		layers: LayersSchema.optional(),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
		sandbox: SandboxSchema.optional(),
	})
	.strict()

export type StackFunctionProps = z.output<typeof StackFnSchema>

export const StackFunctionSchema = z.union([
	LocalFileSchema.transform(code => ({
		code,
	})).pipe(StackFnSchema),
	StackFnSchema,
])

export const FunctionsSchema = z
	.record(ResourceIdSchema, StackFunctionSchema)
	.optional()
	.describe('Define the functions in your stack.')

export const FunctionDefaultSchema = z
	.object({
		runtime: RuntimeSchema.default('nodejs24.x'),
		handler: HandlerSchema.default('index.default'),
		minify: MinifySchema.default(true),
		external: z
			.string()
			.array()
			.optional()
			.describe(`A list of external packages that won't be included in the bundle.`),
		log: LogSchema.default(true).transform(log => ({
			retention: log.retention ?? days(7),
			level: 'level' in log ? log.level : 'error',
			system: 'system' in log ? log.system : 'warn',
			format: 'format' in log ? log.format : 'json',
		})),
		// The defaults size the shared bundle lambda, which also serves queues,
		// crons & tasks. Stand-alone functions inherit them as well.
		timeout: TimeoutSchema.default('15 minutes'),
		memorySize: MemorySizeSchema.default('1024 MB'),
		architecture: ArchitectureSchema.default('arm64'),
		// Stand-alone functions live outside the vpc unless they opt in.
		vpc: VPCSchema.default(false),
		ephemeralStorageSize: EphemeralStorageSizeSchema.default('512 MB'),
		reserved: ReservedConcurrentExecutionsSchema.optional(),
		layers: LayersSchema.optional(),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
	})
	.default({})

export type FunctionDefaultProps = z.output<typeof FunctionDefaultSchema>
