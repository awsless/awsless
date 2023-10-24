
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
import { getGlobalOnFailure, hasOnFailure } from './on-failure/util.js';
import { camelCase } from 'change-case';
import { directories } from '../util/path.js';
import { relative } from 'path';
import { TypeGen, TypeObject } from '../util/type-gen.js';
import { formatName } from '../formation/util.js';
import { rollupBundle } from '../formation/resource/lambda/util/rollup.js';

const MemorySizeSchema = SizeSchema
	.refine(sizeMin(Size.megaBytes(128)), 'Minimum memory size is 128 MB')
	.refine(sizeMax(Size.gigaBytes(10)), 'Minimum memory size is 10 GB')

const TimeoutSchema = DurationSchema
	.refine(durationMin(Duration.seconds(10)), 'Minimum timeout duration is 10 seconds')
	.refine(durationMax(Duration.minutes(15)), 'Maximum timeout duration is 15 minutes')

const EphemeralStorageSizeSchema = SizeSchema
	.refine(sizeMin(Size.megaBytes(512)), 'Minimum ephemeral storage size is 512 MB')
	.refine(sizeMax(Size.gigaBytes(10)), 'Minimum ephemeral storage size is 10 GB')

const ReservedConcurrentExecutionsSchema = z.number().int().min(0)
const EnvironmentSchema = z.record(z.string(), z.string()).optional()
const ArchitectureSchema = z.enum([ 'x86_64', 'arm64' ])
const RetryAttemptsSchema = z.number().int().min(0).max(2)
const RuntimeSchema = z.enum([
	'nodejs18.x',
])

const PermissionSchema = z.object({
	effect: z.enum([ 'allow', 'deny' ]).default('allow'),
	actions: z.string().array(),
	resources: z.string().array(),
})

const PermissionsSchema = z.union([ PermissionSchema, PermissionSchema.array() ])

const LogSchema = z.union([
	z.boolean(),
	DurationSchema.refine(durationMin(Duration.days(1)), 'Minimum log retention is 1 day'),
])

const WarmSchema = z.number().int().min(0).max(10)

export const FunctionSchema = z.union([
	LocalFileSchema,
	z.object({
		/** The file path of the function code. */
		file: LocalFileSchema,

		/** The name of the exported method within your code that Lambda calls to run your function.
		 * @default 'index.default'
		 */
		handler: z.string().optional(),

		/** Minify the function code.
		 * @default true
		 */
		minify: z.boolean().optional(),

		/** Specify how many functions you want to warm up each 5 minutes.
		 * You can specify a number from 0 to 10.
		 * @default 0
		 */
		warm: WarmSchema.optional(),

		/** Put the function inside your global VPC.
		 * @default false
		 */
		vpc: z.boolean().optional(),

		/** Enable logging to a CloudWatch log group.
		 * Providing a duration value will set the log retention time.
		 * @default false
		 */
		log: LogSchema.optional(),

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

		/** The number of simultaneous executions to reserve for the function.
		 * You can specify a number from 0.
		 */
		reserved: ReservedConcurrentExecutionsSchema.optional(),

		/** Environment variable key-value pairs.
		 * @example
		 * {
		 *   environment: {
		 *     name: 'value'
		 *   }
		 * }
		 */
		environment: EnvironmentSchema.optional(),

		/** Add IAM permissions to your function.
		 * @example
		 * {
		 *   permissions: {
		 *     actions: [ 's3:PutObject' ],
		 *     resources: [ '*' ]
		 *   }
		 * }
		 */
		permissions: PermissionsSchema.optional(),
	})
])

export const isFunctionProps = (input:unknown): input is z.output<typeof FunctionSchema> => {
	return (
		typeof input === 'string' ||
		typeof (input as { file?: string }).file === 'string'
	)
}

const schema = z.object({
	defaults: z.object({
		function: z.object({
			/** The name of the exported method within your code that Lambda calls to run your function.
			 * @default 'default'
		 	 */
			handler: z.string().default('default'),

			/** Minify the function code.
			 * @default true
			 */
			minify: z.boolean().default(true),

			/** Specify how many functions you want to warm up each 5 minutes.
			 * You can specify a number from 0 to 10.
			 * @default 0
			 */
			warm: WarmSchema.default(0),

			/** Put the function inside your global VPC.
			 * @default false
			 */
			vpc: z.boolean().default(false),

			/** Enable logging to a CloudWatch log group.
			 * @default false
			 */
			log: LogSchema.default(false),

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

			/** The number of simultaneous executions to reserve for the function.
			 * You can specify a number from 0.
			 */
			reserved: ReservedConcurrentExecutionsSchema.optional(),

			/** Environment variable key-value pairs.
			 * @example
			 * {
			 *   environment: {
			 *     name: 'value'
			 *   }
			 * }
			 */
			environment: EnvironmentSchema.optional(),

			/** Add IAM permissions to your function.
			 * @example
			 * {
			 *   permissions: {
			 *     actions: [ 's3:PutObject' ],
			 *     resources: [ '*' ]
			 *   }
			 * }
			 */
			permissions: PermissionsSchema.optional(),

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

const typeGenCode = `
import { InvokeOptions } from '@awsless/lambda'

type Invoke<Name extends string, Func extends (...args: any[]) => any> = {
	name: Name
	(payload: Parameters<Func>[0], options?: Omit<InvokeOptions, 'name' | 'payload'>): ReturnType<Func>
	async: (payload: Parameters<Func>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>) => ReturnType<Func>
}`

export const functionPlugin = definePlugin({
	name: 'function',
	schema,
	onTypeGen({ config }) {
		const types = new TypeGen('@awsless/awsless', 'FunctionResources')
		types.addCode(typeGenCode)

		for(const stack of config.stacks) {
			const list = new TypeObject()
			for(const [ name, fileOrProps ] of Object.entries(stack.functions || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatName(`${config.name}-${stack.name}-${name}`)
				const file = typeof fileOrProps === 'string' ? fileOrProps : fileOrProps.file
				const relFile = relative(directories.types, file)

				types.addImport(varName, relFile)
				list.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
			}

			types.addType(stack.name, list.toString())
		}

		return types.toString()
	},
	onStack(ctx) {
		const { config, stack } = ctx

		for(const [ id, fileOrProps ] of Object.entries(ctx.stackConfig.functions || {})) {
			const props = typeof fileOrProps === 'string'
				? { ...config.defaults?.function, file: fileOrProps }
				: { ...config.defaults?.function, ...fileOrProps }

			const lambda = toLambdaFunction(ctx as any, id, fileOrProps)

			const invoke = new EventInvokeConfig(id, {
				functionName: lambda.name,
				retryAttempts: props.retryAttempts,
				onFailure: getGlobalOnFailure(ctx),
			}).dependsOn(lambda)

			if(hasOnFailure(ctx.config)) {
				lambda.addPermissions({
					actions: [ 'sqs:SendMessage' ],
					resources: [ getGlobalOnFailure(ctx)! ]
				})
			}

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
	const bootstrap = ctx.bootstrap

	const props = typeof fileOrProps === 'string'
		? { ...config.defaults?.function, file: fileOrProps }
		: { ...config.defaults?.function, ...fileOrProps }

	const lambda = new Function(id, {
		name: `${config.name}-${stack.name}-${id}`,
		code: Code.fromFile(id, props.file, rollupBundle({
			handler: props.handler,
			minify: props.minify,
		})),
		...props,
		vpc: undefined,
	})

	if(config.defaults?.function?.permissions) {
		lambda.addPermissions(config.defaults?.function?.permissions)
	}

	if(typeof fileOrProps === 'object' && fileOrProps.permissions) {
		lambda.addPermissions(fileOrProps.permissions)
	}

	lambda
		.addEnvironment('APP', config.name)
		.addEnvironment('STAGE', config.stage)
		.addEnvironment('STACK', stack.name)

	if(props.log) {
		lambda.enableLogs(props.log instanceof Duration ? props.log : undefined)
	}

	// debug(id, props.warm);

	if(props.warm) {
		// debug(props);
		lambda.warmUp(props.warm)
	}

	if(props.vpc) {
		lambda.setVpc({
			securityGroupIds: [
				bootstrap.import(`vpc-security-group-id`),
			],
			subnetIds: [
				bootstrap.import(`public-subnet-1`),
				bootstrap.import(`public-subnet-2`),
			],
		}).addPermissions({
			actions: [
				'ec2:CreateNetworkInterface',
				'ec2:DescribeNetworkInterfaces',
				'ec2:DeleteNetworkInterface',
				'ec2:AssignPrivateIpAddresses',
				'ec2:UnassignPrivateIpAddresses',
			],
			resources: [ '*' ],
		})
	}

	ctx.bind(other => {
		other.addPermissions(lambda.permissions)
	})

	return lambda
}
