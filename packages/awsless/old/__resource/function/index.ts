import { Architecture, Function, CfnFunction, Code, EventInvokeConfigOptions } from 'aws-cdk-lib/aws-lambda'
import { Duration, toDuration } from '../../util/duration'
import { Runtime, toRuntime } from './runtime'
import { toArchitecture } from './architecture'
import { Size, toSize } from '../../util/size'
import { Build, writeBuildFiles, writeBuildHash } from './build'
import { Context } from '../../stack'
import { SnsDestination } from 'aws-cdk-lib/aws-lambda-destinations'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { addResourceEnvironment, toArn, toId, toName } from '../../util/resource'
import { findAllTopicIds } from '../../stack/app-bootstrap'
import { publishFunctionAsset } from './publish'
import { assetBucketName } from '../../stack/bootstrap'
import { defaultBuild } from './build-worker'
// import { debug } from '../../cli/logger'
// import { style } from '../../cli/style'

export type FunctionDefaults = {
	timeout?: Duration
	runtime?: Runtime
	architecture?: Lowercase<keyof Pick<typeof Architecture, 'ARM_64' | 'X86_64'>>
	ephemeralStorageSize?: Size,
	build?: Build
	log?: boolean
	environment?: Record<string, string>
	retryAttempts?: 0 | 1 | 2
}

export type FunctionConfig = string | {
	file: string
} & FunctionDefaults

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export const toFunction = ({ stack, stackConfig, config, assets }:Context, id: string, file: FunctionConfig) => {

	const props = typeof file === 'string' ? { ...config.defaults?.function, file } : file

	const lambda = new Function(stack, toId('function', id), {
		functionName: toName(stack, id),
		runtime: toRuntime(props.runtime ?? 'nodejs18.x'),
		handler: 'index.default',
		code: Code.fromInline('export default () => {}'),
		timeout: toDuration(props.timeout ?? '30 seconds'),
		architecture: toArchitecture(props.architecture ?? 'arm_64'),
		ephemeralStorageSize: toSize(props.ephemeralStorageSize ?? '512 MB'),
		environment: props.environment,
	})

	// ------------------------------------------------------------

	assets.add({
		stack: stackConfig,
		resource: 'function',
		resourceName: id,
		async build() {
			const result = await defaultBuild(props.file)

			await writeBuildFiles(config, stack, id, result.files)
			await writeBuildHash(config, stack, id, result.hash)

			const func = lambda.node.defaultChild! as CfnFunction
			func.handler = result.handler

			return {
				size: 'SMALL'
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

	// tasks.add('build', async () => {
	// 	debug('Build function asset:', style.info(props.file))

	// 	const result = await defaultBuild(props.file)

	// 	await writeBuildFiles(config, stack, id, result.files)
	// 	await writeBuildHash(config, stack, id, result.hash)

	// 	debug('Done building function asset:', style.info(props.file))

	// 	const func = lambda.node.defaultChild! as CfnFunction
	// 	func.handler = result.handler

	// 	// const code = AssetCode.fromAsset(path, {
	// 	// 	assetHash: result.hash,
	// 	// 	assetHashType: AssetHashType.CUSTOM
	// 	// })

	// 	// const config = code.bind(lambda)
	// 	// const func = lambda.node.defaultChild! as CfnFunction

	// 	// func.handler = result.handler
	// 	// func.code = {
	// 	// 	s3Bucket: config.s3Location?.bucketName,
	// 	// 	s3Key: config.s3Location?.objectKey,
	// 	// 	s3ObjectVersion: config.s3Location?.objectVersion,
	// 	// }

	// 	// code.bindToResource(func)
	// })

	// tasks.add('publish-asset', async () => {

	// 	debug('Publish function asset:', style.info(props.file))

	// 	const version = await publishFunctionAsset(config, stack, id)

	// 	debug('Done publishing function asset:', style.info(props.file))

	// 	const func = lambda.node.defaultChild! as CfnFunction
	// 	func.code = {
	// 		s3Bucket: assetBucketName(config),
	// 		s3Key: `${config.name}/${ stack.artifactId }/function/${id}.zip`,
	// 		s3ObjectVersion: version,
	// 	}
	// })

	// ------------------------------------------------------------

	const topicIds = findAllTopicIds(config)
	const eventInvokeConfig: Writeable<EventInvokeConfigOptions> = {
		retryAttempts: props.retryAttempts ?? 2
	}

	if(topicIds.includes('failure')) {
		const arn = toArn(stack, 'sns', 'topic', 'failure')
		const failure = Topic.fromTopicArn(stack, toId('topic', 'failure'), arn)
		eventInvokeConfig.onFailure = new SnsDestination(failure)
	}

	lambda.configureAsyncInvoke(eventInvokeConfig)

	// ------------------------------------------------------------

	lambda.addEnvironment('APP', config.name, { removeInEdge: true })
	lambda.addEnvironment('STAGE', config.stage, { removeInEdge: true })
	lambda.addEnvironment('STACK', stackConfig.name, { removeInEdge: true })

	// ------------------------------------------------------------

	if (lambda.runtime.toString().startsWith('nodejs')) {
		lambda.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', {
			removeInEdge: true,
		})
	}

	return {
		lambda,
		bind: (other: Function) => {

			lambda.grantInvoke(other)
			addResourceEnvironment(stack, 'function', id, other)
		}
	}
}
