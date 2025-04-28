import { $, Future, Group, Input, resolveInputs, Resource } from '@awsless/formation'
import { generateFileHash } from '@awsless/ts-file-cache'
import deepmerge from 'deepmerge'
import { basename } from 'path'
import { getBuildPath } from '../../build/index.js'
import { AppContext, Permission, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { bundleTypeScript } from './build/typescript/bundle.js'
import { zipFiles } from './build/zip.js'
import { FunctionProps } from './schema.js'
// import { getGlobalOnFailure, hasOnFailure } from '../on-failure/util.js'
import { days, toDays, toSeconds } from '@awsless/duration'
import { toMebibytes } from '@awsless/size'
import { pascalCase } from 'change-case'
// import { hashElement } from 'folder-hash'
// import { FileError } from '../../error.js'
import { shortId } from '../../util/id.js'
import { relativePath } from '../../util/path.js'
import { createTempFolder } from '../../util/temp.js'
import { formatFilterPattern, getGlobalOnLog } from '../on-log/util.js'
import { zipBundle } from './build/bundle/bundle.js'
import { bundleCacheKey } from './build/bundle/cache.js'
// import { buildDockerImage } from './build/container/build.js'

// type Function = $.aws.lambda.Function
// type Policy = $.aws.iam.RolePolicy
// type Code = $.aws.lambda.Code

// type Statement = {
// 	effect?: 'allow' | 'deny'
// 	action: string | string[]
// 	resource: Input<string> | Input<Input<string>[]>
// }

// export type LambdaFunctionProps = z.infer<typeof FunctionSchema>

export const createLambdaFunction = (
	group: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: FunctionProps
) => {
	let name: string
	let roleName: string

	if ('stack' in ctx) {
		name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
		})

		roleName = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: shortId(`${id}:${ctx.appId}`),
		})
	} else {
		name = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: ns,
			resourceName: id,
		})

		roleName = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: ns,
			resourceName: shortId(`${id}:${ctx.appId}`),
		})
	}

	// ctx.appConfig.defaults.function.log.retention

	const props = deepmerge(ctx.appConfig.defaults.function, local)
	let code: $.aws.s3.BucketObject

	// ------------------------------------------------------------
	// Check if layer has been defined on the app level

	// const layers = props.layers ?? []
	// if (layers.length) {
	// 	if (!ctx.shared.get('layer', 'arn', id)) {
	// 		if ('stack' in ctx) {
	// 			throw new FileError(ctx.stackConfig.file, `Layer "${id}" is not defined in app.json`)
	// 		} else {
	// 			throw new FileError('app.json', `Layer "${id}" is not defined in app.json`)
	// 		}
	// 	}
	// }

	// ------------------------------------------------------------

	if (props.runtime === 'container') {
		throw new Error('Container not supported atm')
		// ctx.registerBuild('function', name, async build => {
		// 	if (!('file' in local.code)) {
		// 		throw new Error('code.file needs to be set for functions with the "container" runtime')
		// 	}
		// 	const cwd = dirname(local.code.file)
		// 	const version = await hashElement(cwd, {
		// 		files: {
		// 			exclude: ['stack.json'],
		// 		},
		// 	})
		// 	return build(version.hash + props.architecture, async write => {
		// 		const image = await buildDockerImage({
		// 			name,
		// 			cwd,
		// 			architecture: props.architecture,
		// 		})
		// 		await write('HASH', image.id)
		// 		return {
		// 			size: formatByteSize(image.size),
		// 		}
		// 	})
		// })
		// const image = new $.aws.ecr.Image(group, 'image', {
		// 	repository: ctx.shared.get('function-repository-name'),
		// 	hash: Asset.fromFile(getBuildPath('function', name, 'HASH')),
		// 	name: name,
		// 	tag: 'latest',
		// })
		// code = {
		// 	imageUri: image.uri,
		// }
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
						...(props.layers ?? []).flatMap(id => ctx.shared.entry('layer', `packages`, id)),
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

		code = new $.aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('function', 'bucket-name'),
			key: `/lambda/${name}.zip`,
			source: relativePath(getBuildPath('function', name, 'bundle.zip')),
			sourceHash: $hash(getBuildPath('function', name, 'HASH')),
			// body: Asset.fromFile(getBuildPath('function', name, 'bundle.zip')),
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

		code = new $.aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('function', 'bucket-name'),
			key: `lambda/${name}.zip`,
			source: relativePath(getBuildPath('function', name, 'bundle.zip')),
			sourceHash: $hash(getBuildPath('function', name, 'HASH')),
		})
	}

	// ------------------------------------------------------------

	const role = new $.aws.iam.Role(group, 'role', {
		name: roleName,
		description: name,
		assumeRolePolicy: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: 'sts:AssumeRole',
					Principal: {
						Service: ['lambda.amazonaws.com'],
					},
				},
			],
		}),
	})

	const statements: Permission[] = []

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)
		policy.$.attachDependencies(permissions)
	}

	ctx.onPermission(statement => {
		addPermission(statement)
	})

	// const document = $.aws.iam.getPolicyDocument({
	// 	statement: statements.map(statement => ({
	// 		effect: pascalCase(statement.effect ?? 'allow'),
	// 		actions: statement.actions,
	// 		resources: statement.resources,
	// 	})),
	// })

	const policy = new $.aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		policy: new Future(async resolve => {
			const list = await resolveInputs(statements)

			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: list.map(statement => ({
						Effect: pascalCase(statement.effect ?? 'allow'),
						Action: statement.actions,
						Resource: statement.resources,
					})),
				})
			)
		}),
	})

	// ------------------------------------------------------------
	// VPC

	let dependsOn: Resource<any, any>[] = []
	if (props.vpc) {
		dependsOn.push(
			new $.aws.iam.RolePolicy(group, 'vpc-policy', {
				role: role.name,
				name: 'lambda-vpc-policy',
				policy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: [
								'ec2:CreateNetworkInterface',
								'ec2:DescribeNetworkInterfaces',
								'ec2:DeleteNetworkInterface',
								'ec2:AssignPrivateIpAddresses',
								'ec2:UnassignPrivateIpAddresses',
							],
							Resource: ['*'],
						},
					],
				}),
			})
		)
	}

	// ------------------------------------------------------------

	const variables: Record<string, Input<string>> = {}
	const logFormats = {
		text: 'Text',
		json: 'JSON',
	}

	const lambda = new $.aws.lambda.Function(
		group,
		`function`,
		{
			// ...props,
			functionName: name,
			role: role.arn,
			// code,
			// runtime: props.runtime === 'container' ? undefined : props.runtime,
			runtime: props.runtime,
			handler: props.handler,
			timeout: toSeconds(props.timeout),
			memorySize: toMebibytes(props.memorySize),
			architectures: [props.architecture],

			timeouts: {
				create: '30s',
				update: '30s',
				delete: '30s',
			},

			layers: props.layers?.map(id => ctx.shared.entry('layer', 'arn', id)),
			s3Bucket: code.bucket,
			s3ObjectVersion: code.versionId,
			s3Key: code.key.pipe(name => {
				if (name.startsWith('/')) {
					return name.substring(1)
				}

				return name
			}),

			sourceCodeHash: $hash(getBuildPath('function', name, 'HASH')),

			environment: {
				variables,
				// variables: new Future(resolve => {
				// 	resolve(variables)
				// }),
			},

			vpcConfig: props.vpc
				? {
						securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
						subnetIds: ctx.shared.get('vpc', 'public-subnets'),
					}
				: undefined,

			loggingConfig: {
				logFormat: logFormats[props.log.format!],
				applicationLogLevel: props.log.level?.toUpperCase(),
				systemLogLevel: props.log.system?.toUpperCase(),
			},
		},
		{
			dependsOn,
		}
	)

	// new aws.lambda.SourceCodeUpdate(group, 'update', {
	// 	functionName: lambda.name,
	// 	version: Asset.fromFile(getBuildPath('function', name, 'HASH')),
	// 	architecture: props.architecture,
	// 	code,
	// })

	// For some features lambda will complain that the policy need to be in place first.
	// lambda.dependsOn(policy)

	// Register the lambda in Awsless...
	// ctx.registerFunction(lambda)

	ctx.onEnv((name, value) => {
		variables[name] = value
		lambda.$.attachDependencies({ value })
	})

	// ctx.registerPolicy(policy)

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId

	if ('stackConfig' in ctx) {
		variables.STACK = ctx.stackConfig.name
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log.retention!.value > 0n) {
		const logGroup = new $.aws.cloudwatch.LogGroup(group, 'log', {
			// name: lambda.functionName.pipe(name => `/aws/lambda/${name}`),
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(props.log.retention ?? days(7)),
		})

		addPermission(
			{
				actions: ['logs:CreateLogStream'],
				resources: [logGroup.arn],
			},
			{
				actions: ['logs:PutLogEvents'],
				resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
			}
		)

		// ------------------------------------------------------------
		// Add Log subscription

		const onLogArn = getGlobalOnLog(ctx)

		if (onLogArn && ctx.appConfig.defaults.onLog) {
			const logFilter = ctx.appConfig.defaults.onLog.filter

			new $.aws.cloudwatch.LogSubscriptionFilter(group, `on-log`, {
				name: 'log-subscription',
				destinationArn: onLogArn,
				logGroupName: logGroup.name,
				filterPattern: formatFilterPattern(logFilter),
			})
		}
	}

	// ------------------------------------------------------------
	// Permissions

	if (ctx.appConfig.defaults.function.permissions) {
		statements.push(...ctx.appConfig.defaults.function.permissions)
	}

	if ('permissions' in local && local.permissions) {
		statements.push(...local.permissions)
	}

	// ------------------------------------------------------------
	// Warm up cron

	if (props.warm) {
		const rule = new $.aws.cloudwatch.EventRule(group, 'warm', {
			name: `${name}--warm`,
			description: 'Lambda Warmer',
			scheduleExpression: 'rate(5 minutes)',
			isEnabled: true,
		})

		new $.aws.cloudwatch.EventTarget(group, 'target', {
			rule: rule.name,
			targetId: 'warmer',
			arn: lambda.arn,
			input: JSON.stringify({
				warmer: true,
				concurrency: props.warm,
			}),
		})

		new $.aws.lambda.Permission(group, `warm`, {
			action: 'lambda:InvokeFunction',
			principal: 'events.amazonaws.com',
			functionName: lambda.functionName,
			sourceArn: rule.arn,
		})
	}

	return {
		name,
		lambda,
		policy,
		code,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(statement: Permission) {
			addPermission(statement)
		},
	}
}

export const createAsyncLambdaFunction = (
	group: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	local: FunctionProps
) => {
	const result = createLambdaFunction(group, ctx, ns, id, local)
	const props = deepmerge(ctx.appConfig.defaults.function, local)

	// ------------------------------------------------------------
	// Make sure we always log errors inside async functions

	result.setEnvironment('LOG_VIEWABLE_ERROR', '1')

	// ------------------------------------------------------------
	// Async Invoke Config

	const onFailure = getGlobalOnFailure(ctx)

	new $.aws.lambda.FunctionEventInvokeConfig(
		group,
		'async',
		{
			functionName: result.lambda.arn,
			maximumRetryAttempts: props.retryAttempts,
			destinationConfig: {
				onFailure: onFailure ? { destination: onFailure } : undefined,
			},
		},
		{
			dependsOn: [result.policy],
		}
	)

	if (onFailure) {
		result.addPermission({
			actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
			resources: [onFailure],
		})
	}

	return result
}
