import { days, minutes, seconds, toDays } from '@awsless/duration'
import { gibibytes, mebibytes } from '@awsless/size'
import { z } from 'zod'
import { durationMax, durationMin, DurationSchema } from '../../config/schema/duration.js'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
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

const EnvironmentSchema = z.record(z.string(), z.string()).optional().describe('Environment variable key-value pairs.')

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

const NodeRuntimeSchema = z.enum(['nodejs18.x', 'nodejs20.x', 'nodejs22.x'])
const ContainerRuntimeSchema = z.literal('container')
const RuntimeSchema = NodeRuntimeSchema.or(ContainerRuntimeSchema)
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

const WarmSchema = z
	.number()
	.int()
	.min(0)
	.max(10)
	.describe('Specify how many functions you want to warm up each 5 minutes. You can specify a number from 0 to 10.')

const VPCSchema = z.boolean().describe('Put the function inside your global VPC.')

const MinifySchema = z.boolean().describe('Minify the function code.')

const HandlerSchema = z
	.string()
	.describe('The name of the exported method within your code that Lambda calls to run your function.')

// const FileSchema = z
// 	.union([LocalFileSchema, LocalDirectorySchema])
// 	.describe('The file path of the function code or a directory that needs to be bundled.')

const DescriptionSchema = z.string().describe('A description of the function.')

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

// const LogSubscriptionSchema = z
// 	.union([
// 		LocalFileSchema.transform(file => ({
// 			file,
// 		})),
// 		z.object({
// 			subscriber: LocalFileSchema,
// 			filter: z.string().optional(),
// 		}),
// 	])
// 	.describe(
// 		'Log Subscription allow you to subscribe to a real-time stream of log events and have them delivered to a specific destination'
// 	)

// const LogSchema

export const LogSchema = z
	.union([
		z.boolean().transform(enabled => ({ retention: enabled ? days(7) : days(0) })),
		LogRetentionSchema.transform(retention => ({ retention })),
		z.object({
			// subscription: LogSubscriptionSchema.optional(),
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

const LayersSchema = z.string().array().describe(
	// `A list of function layers to add to the function's execution environment..`
	`A list of function layers to add to the function's execution environment. Specify each layer by its ARN, including the version.`
)

// const FileBuildSchema = z.object({
// 	// type: z.literal('simple').describe('Specify how to build the function.'),
// 	minify: MinifySchema.default(true),
// 	external: z
// 		.string()
// 		.array()
// 		.optional()
// 		.describe(`A list of external packages that won't be included in the bundle.`),
// })

const FileCodeSchema = z.object({
	file: LocalFileSchema.describe('The file path of the function code.'),
	minify: MinifySchema.optional().default(true),
	external: z
		.string()
		.array()
		.optional()
		.describe(`A list of external packages that won't be included in the bundle.`),
})

// export type FileCode = z.infer<typeof FileCodeSchema>

const BundleCodeSchema = z.object({
	bundle: LocalDirectorySchema.describe('The directory that needs to be bundled.'),
})

// export type BundleCode = z.infer<typeof BundleCodeSchema>

const CodeSchema = z
	.union([
		LocalFileSchema.transform(file => ({
			file,
		})).pipe(FileCodeSchema),
		FileCodeSchema,
		BundleCodeSchema,
	])
	.describe('Specify the code of your function.')

// export type SimpleBuildType = z.infer<typeof SimpleBuildSchema>

// const CustomBuildSchema = z.object({
// 	type: z.literal('custom').describe('Specify how to build the function.'),
// 	cwd: LocalDirectorySchema.default('.').describe('Specify the current working directory for the build command.'),
// 	command: z.string().describe('Specify the build command.'),
// 	// bundle: LocalDirectorySchema.describe('Specify directory that will be bundled.'),
// 	cacheKey: z
// 		.union([LocalFileSchema, LocalDirectorySchema])
// 		.array()
// 		.describe('Specify the source files, and or directories that will be used to generate a cache key.'),
// })

// export type CustomBuildType = z.infer<typeof CustomBuildSchema>

// const BuildSchema = z
// 	.discriminatedUnion('type', [
// 		//
// 		SimpleBuildSchema,
// 		CustomBuildSchema,
// 	])
// 	.describe(`Options for the function bundler`)

// export const FunctionSchema = z.union([
// 	LocalFileSchema.transform(file => ({
// 		file,
// 	})),
// 	z.object({
// 		file: FileSchema,
// 		description: DescriptionSchema.optional(),
// 		handler: HandlerSchema.optional(),
// 		minify: MinifySchema.optional(),
// 		warm: WarmSchema.optional(),
// 		vpc: VPCSchema.optional(),
// 		log: LogSchema.optional(),
// 		timeout: TimeoutSchema.optional(),
// 		runtime: NodeRuntimeSchema.optional(),
// 		memorySize: MemorySizeSchema.optional(),
// 		architecture: ArchitectureSchema.optional(),
// 		ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),
// 		retryAttempts: RetryAttemptsSchema.optional(),
// 		reserved: ReservedConcurrentExecutionsSchema.optional(),
// 		layers: LayersSchema.optional(),
// 		build: BuildSchema.optional(),
// 		environment: EnvironmentSchema.optional(),
// 		permissions: PermissionsSchema.optional(),
// 	}),
// ])

const FnSchema = z.object({
	code: CodeSchema,

	// node
	handler: HandlerSchema.optional(),
	// build: BuildSchema.optional(),
	// bundle: BundleSchema.optional(),

	// container
	// ...

	runtime: RuntimeSchema.optional(),
	description: DescriptionSchema.optional(),
	warm: WarmSchema.optional(),
	vpc: VPCSchema.optional(),
	log: LogSchema.optional(),
	timeout: TimeoutSchema.optional(),
	memorySize: MemorySizeSchema.optional(),
	architecture: ArchitectureSchema.optional(),
	ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),
	retryAttempts: RetryAttemptsSchema.optional(),
	reserved: ReservedConcurrentExecutionsSchema.optional(),
	layers: LayersSchema.optional(),
	environment: EnvironmentSchema.optional(),
	permissions: PermissionsSchema.optional(),
})

export type FunctionProps = z.output<typeof FnSchema>

export const FunctionSchema = z.union([
	LocalFileSchema.transform(code => ({
		code,
	})).pipe(FnSchema),
	FnSchema,
])

export const FunctionsSchema = z
	.record(ResourceIdSchema, FunctionSchema)
	.optional()
	.describe('Define the functions in your stack.')

export const FunctionDefaultSchema = z
	.object({
		runtime: RuntimeSchema.default('nodejs20.x'),

		// node
		handler: HandlerSchema.default('index.default'),
		// build: BuildSchema.default({
		// 	type: 'simple',
		// 	minify: true,
		// }),

		// container

		warm: WarmSchema.default(0),
		vpc: VPCSchema.default(false),
		log: LogSchema.default(true).transform(log => ({
			retention: log.retention ?? days(7),
			level: 'level' in log ? log.level : 'error',
			system: 'system' in log ? log.system : 'warn',
			format: 'format' in log ? log.format : 'json',
		})),
		timeout: TimeoutSchema.default('10 seconds'),
		memorySize: MemorySizeSchema.default('128 MB'),
		architecture: ArchitectureSchema.default('arm64'),
		ephemeralStorageSize: EphemeralStorageSizeSchema.default('512 MB'),
		retryAttempts: RetryAttemptsSchema.default(2),
		reserved: ReservedConcurrentExecutionsSchema.optional(),
		layers: LayersSchema.optional(),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
	})
	.default({})

// export const FunctionDefaultSchema = z
// 	.intersection(
// 		z.object({
// 			warm: WarmSchema.default(0),
// 			vpc: VPCSchema.default(false),
// 			log: LogSchema.default({
// 				retention: '7 days',
// 				level: 'error',
// 				system: 'warn',
// 				format: 'json',
// 			}),
// 			timeout: TimeoutSchema.default('10 seconds'),
// 			memorySize: MemorySizeSchema.default('128 MB'),
// 			architecture: ArchitectureSchema.default('arm64'),
// 			ephemeralStorageSize: EphemeralStorageSizeSchema.default('512 MB'),
// 			retryAttempts: RetryAttemptsSchema.default(2),
// 			reserved: ReservedConcurrentExecutionsSchema.optional(),
// 			layers: LayersSchema.optional(),
// 			environment: EnvironmentSchema.optional(),
// 			permissions: PermissionsSchema.optional(),
// 		}),
// 		z.discriminatedUnion('runtime', [
// 			z.object({
// 				runtime: NodeRuntimeSchema,
// 				handler: HandlerSchema.default('index.default'),
// 				build: BuildSchema.optional(),
// 			}),
// 			z.object({
// 				runtime: ContainerRuntimeSchema,
// 			}),
// 		])
// 	)
// 	.default({
// 		runtime: 'nodejs20.x',
// 	})
