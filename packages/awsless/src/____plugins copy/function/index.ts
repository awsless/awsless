
import { ExtendedConfigOutput, definePlugin } from '../../plugin.js';
import { z } from 'zod'
import { toId, toName } from '../../util/__resource.js';
import { DurationSchema } from '../../schema/duration.js';
import { LocalFileSchema } from '../../schema/local-file.js';
import { CfnFunction, Code, Function } from "aws-cdk-lib/aws-lambda";
import { RuntimeSchema } from './schema/runtime.js';
import { ArchitectureSchema } from './schema/architecture.js';
import { ResourceIdSchema } from '../../schema/resource-id.js';
import { SizeSchema } from '../../schema/size.js';
// import { esBuild } from './util/bundler/esbuild.js';
import { writeBuildFiles, writeBuildHash } from './util/build.js';
import { publishFunctionAsset } from './util/publish.js';
import { assetBucketName } from '../../stack/bootstrap.js';
import { RetryAttempts } from './schema/retry-attempts.js';
import { formatByteSize } from '../../util/byte-size.js';
import { Stack } from 'aws-cdk-lib';
import { Assets } from '../../util/__assets.js';
// import { awslessBuild } from './util/bundler/awsless-code.js';
import { rollupBuild } from './util/bundler/rollup.js';

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
	{ config, stack, assets }: { config: ExtendedConfigOutput<typeof schema>, stack: Stack, assets: Assets },
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
	lambda.addEnvironment('STACK', stack.artifactId, { removeInEdge: true })

	if (lambda.runtime.toString().startsWith('nodejs')) {
		lambda.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', {
			removeInEdge: true,
		})
	}

	assets.add({
		stackName: stack.artifactId,
		resource: 'function',
		resourceName: id,
		async build() {
			const result = await rollupBuild(props.file)

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
