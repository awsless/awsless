import { Asset, aws, Node } from '@awsless/formation'
import deepmerge from 'deepmerge'
import { basename, dirname } from 'path'
import { generateFileHash } from '../../../../ts-file-cache/dist/index.js'
import { getBuildPath } from '../../build/index.js'
import { AppContext, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { bundleTypeScript } from './build/typescript/bundle.js'
import { zipFiles } from './build/zip.js'
import { FunctionProps } from './schema.js'
// import { getGlobalOnFailure, hasOnFailure } from '../on-failure/util.js'
import { hashElement } from 'folder-hash'
import { FileError } from '../../error.js'
import { createTempFolder } from '../../util/temp.js'
import { formatFilterPattern, getGlobalOnLog } from '../on-log/util.js'
import { zipBundle } from './build/bundle/bundle.js'
import { bundleCacheKey } from './build/bundle/cache.js'
import { buildDockerImage } from './build/container/build.js'

type Function = aws.lambda.Function
type Policy = aws.iam.RolePolicy
type Code = aws.lambda.Code

// export type LambdaFunctionProps = z.infer<typeof FunctionSchema>

export const createLambdaFunction = (
	group: Node,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: FunctionProps
): { lambda: Function; policy: Policy; code: Code; name: string } => {
	let name: string

	if ('stack' in ctx) {
		ctx.stackConfig.file
		name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
		})
	} else {
		name = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: ns,
			resourceName: id,
		})
	}

	const props = deepmerge(ctx.appConfig.defaults.function, local)
	let code: aws.lambda.Code

	// ------------------------------------------------------------
	// Check if layer has been defined on the app level

	const layers = props.layers ?? []
	if (layers.length) {
		if (!ctx.shared.get<string[]>(`layer-${id}-arn`)) {
			if ('stack' in ctx) {
				throw new FileError(ctx.stackConfig.file, `Layer "${id}" is not defined in app.json`)
			} else {
				throw new FileError('app.json', `Layer "${id}" is not defined in app.json`)
			}
		}
	}

	// ------------------------------------------------------------

	if (props.runtime === 'container') {
		ctx.registerBuild('function', name, async build => {
			if (!('file' in local.code)) {
				throw new Error('code.file needs to be set for functions with the "container" runtime')
			}
			const cwd = dirname(local.code.file)
			const version = await hashElement(cwd, {
				files: {
					exclude: ['stack.json'],
				},
			})

			return build(version.hash + props.architecture, async write => {
				const image = await buildDockerImage({
					name,
					cwd,
					architecture: props.architecture,
				})

				await write('HASH', image.id)

				return {
					size: formatByteSize(image.size),
				}
			})
		})

		const image = new aws.ecr.Image(group, 'image', {
			repository: ctx.shared.get('function-repository-name'),
			hash: Asset.fromFile(getBuildPath('function', name, 'HASH')),
			name: name,
			tag: 'latest',
		})

		code = {
			imageUri: image.uri,
		}
	} else if ('file' in local.code) {
		const fileCode = local.code
		ctx.registerBuild('function', name, async (build, { workspace }) => {
			const version = await generateFileHash(workspace, fileCode.file)

			return build(version, async write => {
				const temp = await createTempFolder(`function--${name}`)

				const bundle = await bundleTypeScript({
					file: fileCode.file,
					external: [
						...(fileCode.external ?? []),
						...(props.layers ?? []).flatMap(id => ctx.shared.get<string[]>(`layer-${id}-packages`)),
					],
					minify: fileCode.minify,
					nativeDir: temp.path,
				})

				const nativeFiles = await temp.files()
				const archive = await zipFiles([
					...bundle.files,
					...nativeFiles.map(file => ({
						name: basename(file),
						path: file,
					})),
				])

				await Promise.all([
					write('HASH', bundle.hash),
					write('bundle.zip', archive),
					...bundle.files.map(file => write(`files/${file.name}`, file.code)),
					...bundle.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
				])

				await temp.delete()

				return {
					size: formatByteSize(archive.byteLength),
				}
			})
		})

		code = new aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('function-bucket-name'),
			key: `/lambda/${name}.zip`,
			body: Asset.fromFile(getBuildPath('function', name, 'bundle.zip')),
		})
	} else {
		const bundleCode = local.code
		ctx.registerBuild('function', name, async build => {
			const version = await bundleCacheKey({
				directory: bundleCode.bundle,
			})

			return build(version, async write => {
				// await customBuild(buildProps)
				const bundle = await zipBundle({
					directory: bundleCode.bundle,
				})

				await write('HASH', version)
				await write('bundle.zip', bundle)

				return {
					size: formatByteSize(bundle.byteLength),
				}
			})
		})

		code = new aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('function-bucket-name'),
			key: `/lambda/${name}.zip`,
			body: Asset.fromFile(getBuildPath('function', name, 'bundle.zip')),
		})
	}

	// const inlinePolicies: aws.iam.PolicyDocument[] = []

	const role = new aws.iam.Role(group, 'role', {
		name,
		assumedBy: 'lambda.amazonaws.com',
		// policies: inlinePolicies,
	})

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		version: '2012-10-17',
		// statements: [
		// 	{
		// 		// Give lambda access to all lambda's inside your app.
		// 		actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
		// 		resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
		// 	},
		// ],
	})

	// const policy = role.addPolicy('policy', {
	// 	name: 'lambda-policy',
	// 	statements: [
	// 		{
	// 			// Give lambda access to all lambda's inside your app.
	// 			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
	// 			resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
	// 		},
	// 	],
	// })

	const lambda = new aws.lambda.Function(group, `function`, {
		...props,
		name,
		role: role.arn,
		code,
		runtime: props.runtime === 'container' ? undefined : props.runtime,
		layers: props.layers?.map(id => ctx.shared.get<`arn:${string}`>(`layer-${id}-arn`)).filter(v => !!v),

		// Remove conflicting props.
		vpc: undefined,
		log: props.log as any,
	})

	new aws.lambda.SourceCodeUpdate(group, 'update', {
		functionName: lambda.name,
		version: Asset.fromFile(getBuildPath('function', name, 'HASH')),
		architecture: props.architecture,
		code,
	})

	// For some features lambda will complain that the policy need to be in place first.
	// lambda.dependsOn(policy)

	// Register the lambda in Awsless...
	// ctx.registerFunction(lambda)

	ctx.onEnv((name, value) => {
		lambda.addEnvironment(name, value)
	})

	ctx.registerPolicy(policy)

	// ------------------------------------------------------------
	// Env Vars

	lambda.addEnvironment('APP', ctx.appConfig.name)
	lambda.addEnvironment('APP_ID', ctx.appId)
	// lambda.addEnvironment('STORE_POSTFIX', ctx.appId)
	// lambda.addEnvironment('STAGE', ctx.stage)
	lambda.addEnvironment('AWS_ACCOUNT_ID', ctx.accountId)

	if ('stackConfig' in ctx) {
		lambda.addEnvironment('STACK', ctx.stackConfig.name)
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log.retention!.value > 0n) {
		const logGroup = new aws.cloudWatch.LogGroup(group, 'log', {
			name: lambda.name.apply(name => `/aws/lambda/${name}`),
			retention: props.log.retention,
		})

		policy.addStatement(
			{
				actions: ['logs:CreateLogStream'],
				resources: [logGroup.arn],
			},
			{
				actions: ['logs:PutLogEvents'],
				resources: [logGroup.arn.apply(arn => `${arn}:*` as `arn:${string}`)],
			}
		)

		// ------------------------------------------------------------
		// Add Log subscription

		const onLogArn = getGlobalOnLog(ctx)

		if (onLogArn && ctx.appConfig.defaults.onLog) {
			const logFilter = ctx.appConfig.defaults.onLog.filter

			new aws.cloudWatch.SubscriptionFilter(group, `on-log`, {
				destinationArn: onLogArn,
				logGroupName: logGroup.name,
				filterPattern: formatFilterPattern(logFilter),
			})

			// const permission = new aws.lambda.Permission(group, 'log-subscription-permission', {
			// 	action: 'lambda:InvokeFunction',
			// 	principal: 'logs.amazonaws.com',
			// 	functionArn: logSubscriptionArn,
			// 	sourceArn: logGroup.arn,
			// })

			// subscriptionFilter.dependsOn(permission)
		}
	}

	// ------------------------------------------------------------
	// Permissions

	if (ctx.appConfig.defaults.function.permissions) {
		policy.addStatement(...ctx.appConfig.defaults.function.permissions)
	}

	if ('permissions' in local && local.permissions) {
		policy.addStatement(...local.permissions)
	}

	// ------------------------------------------------------------
	// Warm up cron

	if (props.warm) {
		const rule = new aws.events.Rule(group, 'warm', {
			name: `${name}--warm`,
			schedule: 'rate(5 minutes)',
			enabled: true,
			targets: [
				{
					id: 'warmer',
					arn: lambda.arn,
					input: {
						warmer: true,
						concurrency: props.warm,
					},
				},
			],
		})

		new aws.lambda.Permission(group, `warm`, {
			action: 'lambda:InvokeFunction',
			principal: 'events.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: rule.arn,
		})
	}

	// ------------------------------------------------------------
	// VPC

	if (props.vpc) {
		lambda.setVpc({
			securityGroupIds: [ctx.shared.get<string>(`vpc-security-group-id`)],
			subnetIds: [
				ctx.shared.get<string>(`vpc-public-subnet-id-1`),
				ctx.shared.get<string>(`vpc-public-subnet-id-2`),
			],
		})

		const vpcPolicy = new aws.iam.RolePolicy(group, 'vpc-policy', {
			role: role.name,
			name: 'lambda-vpc-policy',
			version: '2012-10-17',
			statements: [
				{
					actions: [
						'ec2:CreateNetworkInterface',
						'ec2:DescribeNetworkInterfaces',
						'ec2:DeleteNetworkInterface',
						'ec2:AssignPrivateIpAddresses',
						'ec2:UnassignPrivateIpAddresses',
					],
					resources: ['*'],
				},
			],
		})

		lambda.dependsOn(vpcPolicy)

		// inlinePolicies.push({
		// 	name: 'vpc',
		// 	statements: [
		// 		{
		// 			actions: [
		// 				'ec2:CreateNetworkInterface',
		// 				'ec2:DescribeNetworkInterfaces',
		// 				'ec2:DeleteNetworkInterface',
		// 				'ec2:AssignPrivateIpAddresses',
		// 				'ec2:UnassignPrivateIpAddresses',
		// 			],
		// 			resources: ['*'],
		// 		},
		// 	],
		// })

		// policy.addStatement({
		// 	actions: [
		// 		'ec2:CreateNetworkInterface',
		// 		'ec2:DescribeNetworkInterfaces',
		// 		'ec2:DeleteNetworkInterface',
		// 		'ec2:AssignPrivateIpAddresses',
		// 		'ec2:UnassignPrivateIpAddresses',
		// 	],
		// 	resources: ['*'],
		// })
	}

	return {
		name,
		lambda,
		policy,
		code,
	}
}

export const createAsyncLambdaFunction = (
	group: Node,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: FunctionProps
) => {
	const result = createLambdaFunction(group, ctx, ns, id, local)
	const props = deepmerge(ctx.appConfig.defaults.function, local)

	// ------------------------------------------------------------
	// Make sure we always log errors inside async functions

	result.lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

	// ------------------------------------------------------------
	// Async Invoke Config

	const invokeConfig = new aws.lambda.EventInvokeConfig(group, 'async', {
		functionArn: result.lambda.arn,
		retryAttempts: props.retryAttempts,
		onFailure: getGlobalOnFailure(ctx),
	})

	invokeConfig.dependsOn(result.policy)

	const onFailure = getGlobalOnFailure(ctx)

	if (onFailure) {
		result.policy.addStatement({
			actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
			resources: [onFailure],
		})
	}

	return result
}
