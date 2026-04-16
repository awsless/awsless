import { days, toDays } from '@awsless/duration'
import { toMebibytes } from '@awsless/size'
import { z } from 'zod'
import { durationMin, DurationSchema } from '../../config/schema/duration.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { SizeSchema } from '../../config/schema/size.js'

const CpuSchema = z
	.union([z.literal(0.25), z.literal(0.5), z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)])
	.transform(v => `${v} vCPU`)
	.describe('The number of virtual CPU units (vCPU) used by the job. Valid values: 0.25, 0.5, 1, 2, 4, 8, 16 vCPU.')

const validMemorySize = [
	// 0.25 vCPU
	512, 1024, 2048,
	// 0.5 vCPU
	1024, 2048, 3072, 4096,
	// 1 vCPU
	2048, 3072, 4096, 5120, 6144, 7168, 8192,
	// 2 vCPU
	4096, 5120, 6144, 7168, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384,
]

const MemorySizeSchema = SizeSchema.refine(
	s => validMemorySize.includes(toMebibytes(s)),
	`Invalid memory size. Allowed sizes: ${validMemorySize.join(', ')} MiB`
).describe('The amount of memory (in MiB) used by the job. Valid memory values depend on the CPU configuration.')

const EnvironmentSchema = z.record(z.string(), z.string()).optional().describe('Environment variable key-value pairs.')

const ArchitectureSchema = z
	.enum(['x86_64', 'arm64'])
	.describe('The instruction set architecture that the job supports.')

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
	.describe('Add IAM permissions to your job.')

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
	file: LocalFileSchema.describe('The file path of the job code.'),
})

const CodeSchema = z
	.union([
		LocalFileSchema.transform(file => ({
			file,
		})).pipe(FileCodeSchema),
		FileCodeSchema,
	])
	.describe('Specify the code of your job.')

const TimeoutSchema = DurationSchema.describe('The maximum time the job is allowed to run before being stopped.')

const ImageSchema = z.string().describe('The URL of the container image to use. Default: public.ecr.aws/aws-cli/aws-cli:{architecture}')

const PersistentStorageSchema = z
	.boolean()
	.describe('Mount persistent storage for the job at a fixed internal path.')

const StartupCommandSchema = z
	.union([z.string().transform(v => [v]), z.string().array()])
	.describe('Optional shell commands to run before the job executable is downloaded and started.')

const ASchema = z.object({
	code: CodeSchema,
	image: ImageSchema.optional(),
	persistentStorage: PersistentStorageSchema.optional(),
	startupCommand: StartupCommandSchema.optional(),
	log: LogSchema.optional(),
	cpu: CpuSchema.optional(),
	memorySize: MemorySizeSchema.optional(),
	architecture: ArchitectureSchema.optional(),
	environment: EnvironmentSchema.optional(),
	permissions: PermissionsSchema.optional(),
	timeout: TimeoutSchema.default('30 minutes').describe('The maximum time the job is allowed to run before being stopped. Default: 30 minutes.'),
})

const JobSchema = z.union([
	LocalFileSchema.transform(code => ({
		code,
	})).pipe(ASchema),
	ASchema,
])

export const JobsSchema = z.record(ResourceIdSchema, JobSchema).optional().describe('Define the jobs in your stack.')

export type JobProps = z.output<typeof ASchema>

export const JobDefaultSchema = z
	.object({
		image: ImageSchema.optional(),
		persistentStorage: PersistentStorageSchema.optional(),
		cpu: CpuSchema.default(0.25),
		memorySize: MemorySizeSchema.default('512 MB'),
		architecture: ArchitectureSchema.default('arm64'),
		environment: EnvironmentSchema.optional(),
		permissions: PermissionsSchema.optional(),
		timeout: TimeoutSchema.optional(),
		log: LogSchema.default(true).transform(log => ({
			retention: log.retention ?? days(7),
		})),
	})
	.default({})
