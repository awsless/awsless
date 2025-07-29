import { days, toDays } from '@awsless/duration'
import { z } from 'zod'
import { durationMin, DurationSchema } from '../../config/schema/duration.js'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const CpuSizeSchema = z
	.union([
		z.literal('0.25 vCPU'),
		z.literal('0.5 vCPU'),
		z.literal('1 vCPU'),
		z.literal('2 vCPU'),
		z.literal('4 vCPU'),
		z.literal('8 vCPU'),
		z.literal('16 vCPU'),
	])
	.describe(
		'The number of vCPU units used by the task. For tasks using the Fargate launch type, this field is required. Valid values: 0.25, 0.5, 1, 2, 4, 8, 16 vCPU.'
	)

const MemorySizeSchema = z
	.union([
		// 0.25 vCPU
		z.literal('512'),
		z.literal('1024'),
		z.literal('2048'),
		// 0.5 vCPU
		z.literal('1024'),
		z.literal('2048'),
		z.literal('3072'),
		z.literal('4096'),
		// 1 vCPU
		z.literal('2048'),
		z.literal('3072'),
		z.literal('4096'),
		z.literal('5120'),
		z.literal('6144'),
		z.literal('7168'),
		z.literal('8192'),
		// 2 vCPU
		z.literal('4096'),
		z.literal('5120'),
		z.literal('6144'),
		z.literal('7168'),
		z.literal('8192'),
		z.literal('9216'),
		z.literal('10240'),
		z.literal('11264'),
		z.literal('12288'),
		z.literal('13312'),
		z.literal('14336'),
		z.literal('15360'),
		z.literal('16384'),
	])
	.describe(
		'The amount of memory (in MiB) used by the task. For tasks using the Fargate launch type, this field is required and must be compatible with the CPU value. Valid memory values depend on the CPU configuration.'
	)

const HealthCheckSchema = z
	.object({
		command: z
			.union([z.string(), z.string().array()])
			.describe('The command that the container runs to determine if it is healthy.'),
		interval: DurationSchema.describe('The time period in seconds between each health check execution.'),
		retries: z
			.number()
			.int()
			.min(1)
			.max(10)
			.describe(
				'The number of times to retry a failed health check before the container is considered unhealthy.'
			),
		startPeriod: DurationSchema.describe(
			'The optional grace period to provide containers time to bootstrap before failed health checks count towards the maximum number of retries.'
		),
		timeout: DurationSchema.describe(
			'The time period in seconds to wait for a health check to succeed before it is considered a failure.'
		),
	})
	.describe('The health check command and associated configuration parameters for the container.')

const EnvironmentSchema = z.record(z.string(), z.string()).optional().describe('Environment variable key-value pairs.')

const ArchitectureSchema = z
	.enum(['x86_64', 'arm64'])
	.describe('The instruction set architecture that the function supports.')

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

export const LogSchema = z
	.union([
		z.boolean().transform(enabled => ({ retention: enabled ? days(7) : days(0) })),
		LogRetentionSchema.transform(retention => ({ retention })),
		z.object({
			retention: LogRetentionSchema.optional(),
		}),
	])
	.describe('Enable logging to a CloudWatch log group. Providing a duration value will set the log retention time.')

const FileCodeSchema = z.object({
	file: LocalFileSchema.describe('The file path of the function code.'),
	minify: MinifySchema.optional().default(true),
	external: z
		.string()
		.array()
		.optional()
		.describe(`A list of external packages that won't be included in the bundle.`),
})

const BundleCodeSchema = z.object({
	bundle: LocalDirectorySchema.describe('The directory that needs to be bundled.'),
})

const CodeSchema = z
	.union([
		LocalFileSchema.transform(file => ({
			file,
		})).pipe(FileCodeSchema),
		FileCodeSchema,
		BundleCodeSchema,
	])
	.describe('Specify the code of your instance.')

const ISchema = z.object({
	code: CodeSchema,
	description: DescriptionSchema.optional(),
	log: LogSchema.optional(),
	memorySize: MemorySizeSchema.optional(),
	cpuSize: CpuSizeSchema.optional(),
	architecture: ArchitectureSchema.optional(),
	environment: EnvironmentSchema.optional(),
	permissions: PermissionsSchema.optional(),
	healthCheck: HealthCheckSchema.optional(),
})

const InstanceSchema = z.union([
	LocalFileSchema.transform(code => ({
		code,
	})).pipe(ISchema),
	ISchema,
])

export const InstancesSchema = z
	.record(ResourceIdSchema, InstanceSchema)
	.optional()
	.describe('Define the instances in your stack.')

export type InstanceProps = z.output<typeof ISchema>

export const InstanceDefaultSchema = z
	.object({
		image: z.string().optional().describe('The URL of the container image to use.'),
		// handler: HandlerSchema.default('index.default'),
		log: LogSchema.default(true).transform(log => ({
			retention: log.retention ?? days(7),
			level: 'level' in log ? log.level : 'error',
			system: 'system' in log ? log.system : 'warn',
			format: 'format' in log ? log.format : 'json',
		})),
		memorySize: MemorySizeSchema.default('512'),
		cpuSize: CpuSizeSchema.default('0.25 vCPU'),
		architecture: ArchitectureSchema.default('arm64'),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
		healthCheck: HealthCheckSchema.optional(),
	})
	.default({})
