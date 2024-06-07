import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const ImageIdSchema = z
	.string()
	.regex(/^ami\-/)
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
	])
	.describe(`The instance type.`)

const UserDataSchema = LocalFileSchema.describe(
	`The parameters or scripts to store as user data. Any scripts in user data are run when you launch the instance. User data is limited to 16 KB`
)

const CodeSchema = z
	.record(z.string(), LocalDirectorySchema)
	.describe(`Define a directory that will be zipped & uploaded to the asset bucket.`)

export const InstancesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			imageId: ImageIdSchema,
			type: TypeSchema,
			userData: UserDataSchema.optional(),
			code: CodeSchema.optional(),
		})
	)
	.optional()
	.describe('Define the instances in your stack.')
