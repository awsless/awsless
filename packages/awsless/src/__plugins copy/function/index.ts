
import { StackContext, definePlugin } from '../../plugin.js';
import { z } from 'zod'
import { toId, toName } from '../../util/resource.js';
import { DurationSchema } from '../../schema/duration.js';
import { LocalFileSchema } from '../../schema/local-file.js';
import { CfnFunction, Code, Function } from "aws-cdk-lib/aws-lambda";
import { RuntimeSchema } from './schema/runtime.js';
import { ArchitectureSchema } from './schema/architecture.js';
import { ResourceIdSchema } from '../../schema/resource-id.js';
import { SizeSchema } from '../../schema/size.js';
import { defaultBuild } from './util/build-worker.js';
import { writeBuildFiles, writeBuildHash } from './util/build.js';
import { publishFunctionAsset } from './util/publish.js';
import { assetBucketName } from '../../stack/bootstrap.js';
import { RetryAttempts } from './schema/retry-attempts.js';
import { formatByteSize } from '../../util/byte-size.js';

	// timeout?: Duration
	// runtime?: Runtime
	// architecture?: Lowercase<keyof Pick<typeof Architecture, 'ARM_64' | 'X86_64'>>
	// ephemeralStorageSize?: Size,
	// build?: Build
	// log?: boolean
	// environment?: Record<string, string>
	// retryAttempts?: 0 | 1 | 2

export const FunctionSchema = z.union([
	LocalFileSchema,
	z.object({
		file: LocalFileSchema,
		timeout: DurationSchema.optional(),
		runtime: RuntimeSchema.optional(),
		memorySize: SizeSchema.optional(),
		architecture: ArchitectureSchema.optional(),
		ephemeralStorageSize: SizeSchema.optional(),
		retryAttempts: RetryAttempts,
		environment: z.record(z.string(), z.string()).optional(),
	})
])

const schema = z.object({
	defaults: z.object({
		function: z.object({
			timeout: DurationSchema.default('10 seconds'),
			runtime: RuntimeSchema.default('nodejs18.x'),
			memorySize: SizeSchema.default('128 MB'),
			architecture: ArchitectureSchema.default('arm_64'),
			ephemeralStorageSize: SizeSchema.default('512 MB'),
			retryAttempts: RetryAttempts.default(2),
			environment: z.record(z.string(), z.string()).optional(),
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
	onStack(context) {
		return Object.entries(context.stackConfig.functions || {}).map(([ id, fileOrProps ]) => {
			return toFunction(context, id, fileOrProps)
		})
	},
})

export const toFunction = (
	{ config, stack, stackConfig, assets }: StackContext<typeof schema>,
	id: string,
	fileOrProps:z.infer<typeof FunctionSchema>
) => {
	const props = typeof fileOrProps === 'string'
		? { ...config.defaults?.function, file: fileOrProps }
		: { ...config.defaults?.function, ...fileOrProps }

	const lambda = new Function(stack, toId('function', id), {
		functionName: toName(stack, id),
		handler: 'index.default',
		code: Code.fromInline('export default () => {}'),
		...props,
		memorySize: props.memorySize.toMebibytes(),
	})

	lambda.addEnvironment('APP', config.name, { removeInEdge: true })
	lambda.addEnvironment('STAGE', config.stage, { removeInEdge: true })
	lambda.addEnvironment('STACK', stackConfig.name, { removeInEdge: true })

	if (lambda.runtime.toString().startsWith('nodejs')) {
		lambda.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', {
			removeInEdge: true,
		})
	}

	assets.add({
		stack: stackConfig,
		resource: 'function',
		resourceName: id,
		async build() {
			const result = await defaultBuild(props.file)

			const bundle = await writeBuildFiles(config, stack, id, result.files)
			await writeBuildHash(config, stack, id, result.hash)

			const func = lambda.node.defaultChild! as CfnFunction
			func.handler = result.handler

			return {
				size: formatByteSize(bundle.size)
			}
		},
		async publish() {
			const version = await publishFunctionAsset(config, stack, id)
			const func = lambda.node.defaultChild! as CfnFunction

			func.code = {
				s3Bucket: assetBucketName(config),
				s3Key: `${config.name}/${ stack.artifactId }/function/${id}.zip`,
				s3ObjectVersion: version,
			}
		}
	})

	return lambda
}



// import { Architecture, Function, CfnFunction, Code, EventInvokeConfigOptions } from 'aws-cdk-lib/aws-lambda'
// import { Duration, toDuration } from '../../util/duration.js'
// import { Runtime, toRuntime } from './runtime.js'
// import { toArchitecture } from './architecture.js'
// import { Size, toSize } from '../../util/size.js'
// import { Build, writeBuildFiles, writeBuildHash } from './build.js'
// import { Context } from '../../stack.js'
// import { SnsDestination } from 'aws-cdk-lib/aws-lambda-destinations'
// import { Topic } from 'aws-cdk-lib/aws-sns'
// import { addResourceEnvironment, toArn, toId, toName } from '../../util/resource.js'
// import { findAllTopicIds } from '../../stack/global.js'
// import { publishFunctionAsset } from './publish.js'
// import { assetBucketName } from '../../stack/bootstrap.js'
// import { defaultBuild } from './build-worker.js'
// // import { debug } from '../../cli/logger.js'
// // import { style } from '../../cli/style.js'

// export type FunctionDefaults = {
// 	timeout?: Duration
// 	runtime?: Runtime
// 	architecture?: Lowercase<keyof Pick<typeof Architecture, 'ARM_64' | 'X86_64'>>
// 	ephemeralStorageSize?: Size,
// 	build?: Build
// 	log?: boolean
// 	environment?: Record<string, string>
// 	retryAttempts?: 0 | 1 | 2
// }

// export type FunctionConfig = string | {
// 	file: string
// } & FunctionDefaults

// type Writeable<T> = { -readonly [P in keyof T]: T[P] };

// export const toFunction = ({ stack, stackConfig, config, assets }:Context, id: string, file: FunctionConfig) => {

// 	const props = typeof file === 'string' ? { ...config.defaults?.function, file } : file

// 	const lambda = new Function(stack, toId('function', id), {
// 		functionName: toName(stack, id),
// 		runtime: toRuntime(props.runtime ?? 'nodejs18.x'),
// 		handler: 'index.default',
// 		code: Code.fromInline('export default () => {}'),
// 		timeout: toDuration(props.timeout ?? '30 seconds'),
// 		architecture: toArchitecture(props.architecture ?? 'arm_64'),
// 		ephemeralStorageSize: toSize(props.ephemeralStorageSize ?? '512 MB'),
// 		environment: props.environment,
// 	})

// 	// ------------------------------------------------------------

// 	assets.add({
// 		stack: stackConfig,
// 		resource: 'function',
// 		resourceName: id,
// 		async build() {
// 			const result = await defaultBuild(props.file)

// 			await writeBuildFiles(config, stack, id, result.files)
// 			await writeBuildHash(config, stack, id, result.hash)

// 			const func = lambda.node.defaultChild! as CfnFunction
// 			func.handler = result.handler

// 			return {
// 				size: 'SMALL'
// 			}
// 		},
// 		async publish() {
// 			const version = await publishFunctionAsset(config, stack, id)
// 			const func = lambda.node.defaultChild! as CfnFunction

// 			func.code = {
// 				s3Bucket: assetBucketName(config),
// 				s3Key: `${config.name}/${ stack.artifactId }/function/${id}.zip`,
// 				s3ObjectVersion: version,
// 			}
// 		}
// 	})

// 	// tasks.add('build', async () => {
// 	// 	debug('Build function asset:', style.info(props.file))

// 	// 	const result = await defaultBuild(props.file)

// 	// 	await writeBuildFiles(config, stack, id, result.files)
// 	// 	await writeBuildHash(config, stack, id, result.hash)

// 	// 	debug('Done building function asset:', style.info(props.file))

// 	// 	const func = lambda.node.defaultChild! as CfnFunction
// 	// 	func.handler = result.handler

// 	// 	// const code = AssetCode.fromAsset(path, {
// 	// 	// 	assetHash: result.hash,
// 	// 	// 	assetHashType: AssetHashType.CUSTOM
// 	// 	// })

// 	// 	// const config = code.bind(lambda)
// 	// 	// const func = lambda.node.defaultChild! as CfnFunction

// 	// 	// func.handler = result.handler
// 	// 	// func.code = {
// 	// 	// 	s3Bucket: config.s3Location?.bucketName,
// 	// 	// 	s3Key: config.s3Location?.objectKey,
// 	// 	// 	s3ObjectVersion: config.s3Location?.objectVersion,
// 	// 	// }

// 	// 	// code.bindToResource(func)
// 	// })

// 	// tasks.add('publish-asset', async () => {

// 	// 	debug('Publish function asset:', style.info(props.file))

// 	// 	const version = await publishFunctionAsset(config, stack, id)

// 	// 	debug('Done publishing function asset:', style.info(props.file))

// 	// 	const func = lambda.node.defaultChild! as CfnFunction
// 	// 	func.code = {
// 	// 		s3Bucket: assetBucketName(config),
// 	// 		s3Key: `${config.name}/${ stack.artifactId }/function/${id}.zip`,
// 	// 		s3ObjectVersion: version,
// 	// 	}
// 	// })

// 	// ------------------------------------------------------------

// 	const topicIds = findAllTopicIds(config)
// 	const eventInvokeConfig: Writeable<EventInvokeConfigOptions> = {
// 		retryAttempts: props.retryAttempts ?? 2
// 	}

// 	if(topicIds.includes('failure')) {
// 		const arn = toArn(stack, 'sns', 'topic', 'failure')
// 		const failure = Topic.fromTopicArn(stack, toId('topic', 'failure'), arn)
// 		eventInvokeConfig.onFailure = new SnsDestination(failure)
// 	}

// 	lambda.configureAsyncInvoke(eventInvokeConfig)

// 	// ------------------------------------------------------------

// 	lambda.addEnvironment('APP', config.name, { removeInEdge: true })
// 	lambda.addEnvironment('STAGE', config.stage, { removeInEdge: true })
// 	lambda.addEnvironment('STACK', stackConfig.name, { removeInEdge: true })

// 	// ------------------------------------------------------------

// 	if (lambda.runtime.toString().startsWith('nodejs')) {
// 		lambda.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', {
// 			removeInEdge: true,
// 		})
// 	}

// 	return {
// 		lambda,
// 		bind: (other: Function) => {

// 			lambda.grantInvoke(other)
// 			addResourceEnvironment(stack, 'function', id, other)
// 		}
// 	}
// }
