import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const ImageSchema = z
	.string()
	.regex(/^ami\-[0-9a-f]+/)
	.describe('The ID of the AMI.')

const TypeSchema = z
	.enum([
		't3.nano',
		't3.micro',
		't3.small',
		't3.medium',
		't3.large',
		't3.xlarge',
		't3.2xlarge',

		't4g.nano',
		't4g.micro',
		't4g.small',
		't4g.medium',
		't4g.large',
		't4g.xlarge',
		't4g.2xlarge',

		'g4ad.xlarge',
		'g4dn.xlarge',
	])
	.describe(`The instance type.`)

const CommandSchema = z.string().describe(`The script you want to execute when the instance starts up.`)
const CodeSchema = LocalDirectorySchema.describe(`The code directory that will be deployed to your instance.`)
const ConnectSchema = z.boolean().describe('Allows you to connect to all instances with an Instance Connect Endpoint.')

const EnvironmentSchema = z.record(z.string(), z.string()).optional().describe('Environment variable key-value pairs.')

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
	.describe('Add IAM permissions to your instance.')

export const InstanceDefaultSchema = z
	.object({
		connect: ConnectSchema.default(false),
	})
	.default({})
	.describe('Define the default settings for all instances in your stacks.')

export const InstancesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			image: ImageSchema,
			type: TypeSchema,
			code: CodeSchema,
			user: z.string().default('ec2-user'),
			command: CommandSchema.optional(),
			environment: EnvironmentSchema.optional(),
			permissions: PermissionsSchema.optional(),
		})
	)
	.optional()
	.describe('Define the instances in your stack.')
