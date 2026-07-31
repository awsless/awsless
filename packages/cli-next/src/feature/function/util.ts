import { days, Duration, seconds, toDays, toSeconds } from '@awsless/duration'
import { mebibytes, Size, toMebibytes } from '@awsless/size'
import { generateFileHash } from '@awsless/ts-file-cache'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, Resource, resolveInputs } from '@terraforge/core'
import { pascalCase } from 'change-case'
import { createHash } from 'crypto'
import deepmerge from 'deepmerge'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getBuildPath } from '../../build/index.js'
import { FileError } from '../../error.js'
import { AppContext, Permission, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { bundleTypeScriptWithRolldown } from '../bundle/build/rolldown.js'
import { zipFiles } from '../bundle/build/zip.js'
import { compactPolicyStatements, PolicyStatement } from '../bundle/policy.js'
import { filterPattern } from '../on-error-log/util.js'
import { StackFunctionProps } from './schema.js'

// Any lambda infra field opts the function out of the shared bundle.
// The handler & code fields only describe the build & the vpc flag only
// applies to an already stand-alone lambda, so they don't count.
const standaloneFields = [
	'runtime',
	'description',
	'log',
	'timeout',
	'memorySize',
	'architecture',
	'ephemeralStorageSize',
	'reserved',
	'layers',
	'environment',
	'permissions',
	'sandbox',
] as const

export const isStandaloneFunction = (props: StackFunctionProps) => {
	return standaloneFields.some(field => typeof props[field] !== 'undefined')
}


// Deploy a stack function as its own stand-alone lambda, like the old
// awsless did for every function. Callers invoke it directly by name, so
// it deploys in place & doesn't participate in blue-green deployments.
export const createLambdaFunction = (ctx: StackContext, id: string, local: StackFunctionProps) => {
	const group = new Group(ctx.stack, 'function', id)
	const props = deepmerge(ctx.appConfig.defaults.function, local)

	if (props.runtime === 'container') {
		throw new FileError(ctx.stackConfig.file, `The "container" runtime isn't supported for stack functions.`)
	}

	for (const layerId of props.layers ?? []) {
		if (!(layerId in (ctx.appConfig.defaults.layers ?? {}))) {
			throw new FileError(ctx.stackConfig.file, `Layer "${layerId}" is not defined in app.json`)
		}
	}

	const name = formatLocalResourceName({
		appName: ctx.app.name,
		stackName: ctx.stack.name,
		resourceType: 'function',
		resourceName: id,
	})

	// IAM role names are limited to 64 characters.
	const roleName = shortId(`${ctx.app.name}:${ctx.stack.name}:function:${id}:${ctx.appId}`)

	// ------------------------------------------------------------
	// Build & upload the function code.

	const fileCode = local.code

	ctx.registerBuild('function', name, async (build, { workspace }) => {
		const fingerprint = createHash('sha1')
			.update(await generateFileHash(workspace, fileCode.file))
			.update(
				JSON.stringify([
					//
					fileCode.minify,
					fileCode.external,
					fileCode.importAsString,
					fileCode.moduleSideEffects,
				])
			)
			.digest('hex')

		return build(fingerprint, async write => {
			const bundle = await bundleTypeScriptWithRolldown({
				file: fileCode.file,
				minify: fileCode.minify,
				external: [
					...(fileCode.external ?? []),
					...(props.layers ?? []).flatMap(layerId => ctx.shared.entry('layer', 'packages', layerId)),
				],
				moduleSideEffects: fileCode.moduleSideEffects,
				importAsString: fileCode.importAsString,
			})

			const archive = await zipFiles(bundle.files)

			await Promise.all([
				write('HASH', bundle.hash),
				write('bundle.zip', archive),
				...bundle.files.map(file => write(`files/${file.name}`, file.code)),
				...bundle.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
			])

			return {
				size: formatByteSize(archive.byteLength),
			}
		})
	})

	const sourceHash = $file(getBuildPath('function', name, 'HASH'))

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `lambda/${name}.zip`,
			source: relativePath(getBuildPath('function', name, 'bundle.zip')),
			sourceHash,
		},
		{
			replaceOnChanges: ['bucket', 'key'],
		}
	)

	// ------------------------------------------------------------
	// The lambda role & permissions.

	const role = new aws.iam.Role(group, 'role', {
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
	const statementDeps: Set<any> = new Set()

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)

		for (const dep of findInputDeps(permissions)) {
			statementDeps.add(dep)
		}
	}

	const sandboxed = typeof local.sandbox !== 'undefined' && local.sandbox !== false

	// Sandboxed functions don't receive the app wide grants or the app
	// level default permissions, only their own explicit permissions. So
	// they can't touch any other lambda or resource inside the app.
	addPermission(...((sandboxed ? local.permissions : props.permissions) ?? []))

	if (!sandboxed) {
		ctx.onPermission(statement => {
			addPermission(statement)
		})
	}

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		policy: new Output(statementDeps, async (resolve: (value: string) => void) => {
			const list = (await resolveInputs(statements)) as PolicyStatement[]

			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: compactPolicyStatements(list).map(statement => ({
						Effect: pascalCase(statement.effect ?? 'allow'),
						Action: statement.actions,
						Resource: statement.resources,
						Condition: statement.conditions,
					})),
				})
			)
		}),
	})

	// ------------------------------------------------------------
	// VPC

	const dependsOn: Resource[] = [policy]

	if (props.vpc) {
		dependsOn.push(
			new aws.iam.RolePolicy(group, 'vpc-policy', {
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
								'ec2:DescribeSubnets',
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
	// The lambda function.

	const variables: Record<string, Input<string>> = {}
	const logFormats = {
		text: 'Text',
		json: 'JSON',
	}

	const lambda = new aws.lambda.Function(
		group,
		'function',
		{
			functionName: name,
			description: props.description ?? name,
			role: role.arn,
			runtime: props.runtime,
			handler: props.handler,
			timeout: toSeconds(props.timeout),
			memorySize: toMebibytes(props.memorySize),
			architectures: [props.architecture],
			reservedConcurrentExecutions: props.reserved,
			ephemeralStorage: {
				size: toMebibytes(props.ephemeralStorageSize),
			},
			layers: props.layers?.map(layerId => ctx.shared.entry('layer', 'arn', layerId)),

			timeouts: {
				create: '30s',
				update: '30s',
				delete: '30s',
			},

			s3Bucket: code.bucket,
			s3ObjectVersion: code.versionId,
			s3Key: code.key.pipe(name => {
				if (name.startsWith('/')) {
					return name.substring(1)
				}

				return name
			}),

			sourceCodeHash: sourceHash,

			environment: {
				variables,
			},

			vpcConfig: props.vpc
				? {
						securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
						subnetIds: ctx.shared.get('vpc', 'private-subnets'),
						ipv6AllowedForDualStack: true,
					}
				: undefined,

			loggingConfig: {
				logGroup: `/aws/lambda/${name}`,
				logFormat: logFormats[props.log.format!],
				applicationLogLevel: props.log.format === 'json' ? props.log.level?.toUpperCase() : undefined,
				systemLogLevel: props.log.format === 'json' ? props.log.system?.toUpperCase() : undefined,
			},
		},
		{
			dependsOn,
		}
	)

	// Let "awsless config set" restart the function when a config changes.
	ctx.addFunction(lambda)

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	variables.REGION = ctx.appConfig.region
	variables.STAGE = ctx.appConfig.stage ?? 'default'
	variables.STACK = ctx.stackConfig.name

	// Mark the lambda as living outside of the shared bundle.
	if (sandboxed) {
		variables.SANDBOX = 'true'
	} else {
		variables.STANDALONE = 'true'
	}

	if (props.vpc) {
		// Tell all aws clients to use the dualstack endpoint when the
		// lambda runs inside the vpc.
		variables.AWS_USE_DUALSTACK_ENDPOINT = 'true'
	}

	for (const [key, value] of Object.entries(props.environment ?? {})) {
		variables[key] = value
	}

	ctx.onEnv((name, value) => {
		variables[name] = value
	})

	ctx.onBind((name, value) => {
		variables[name] = value
	})

	// ------------------------------------------------------------
	// Sandbox

	if (Array.isArray(local.sandbox) && local.sandbox.length > 0) {
		// The allowlisted routes are served by a private sandbox proxy,
		// the only lambda the sandboxed function is allowed to invoke.
		// The proxy forwards allowlisted routes to the live bundle.
		const bundle = ctx.shared.get('bundle', 'main')
		const distDir = dirname(fileURLToPath(import.meta.url))

		const proxy = createPrebuildLambdaFunction(group, ctx, 'function', `${id}-proxy`, {
			bundleFile: join(distDir, '/prebuild/sandbox-proxy/bundle.zip'),
			bundleHash: join(distDir, '/prebuild/sandbox-proxy/HASH'),
			runtime: 'nodejs24.x',
			handler: 'index.default',

			// The proxy forwards synchronously, so it needs at least the
			// same timeout as the bundle.
			timeout: ctx.appConfig.defaults.function.timeout,

			log: {
				format: 'json',
				level: 'warn',
				system: 'warn',
				retention: days(3),
			},
		})

		proxy.setEnvironment('SANDBOX_ROUTES', JSON.stringify(local.sandbox))

		proxy.addPermission({
			actions: ['lambda:InvokeFunction'],
			resources: [bundle.alias.arn],
		})

		variables.SANDBOX_PROXY = proxy.name

		addPermission({
			actions: ['lambda:InvokeFunction'],
			resources: [proxy.lambda.arn],
		})
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log.retention!.value > 0n) {
		const logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(props.log.retention),
		})

		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})

		if (ctx.shared.has('on-error-log', 'subscriber-arn')) {
			new aws.cloudwatch.LogSubscriptionFilter(
				group,
				'on-error-log',
				{
					name: 'error-log-subscription',
					destinationArn: ctx.shared.get('on-error-log', 'subscriber-arn'),
					logGroupName: logGroup.name,
					filterPattern,
				},
				{
					dependsOn: [ctx.shared.get('on-error-log', 'permission')],
				}
			)
		}
	}

	return {
		name,
		group,
		lambda,
		policy,
		code,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(...permissions: Permission[]) {
			addPermission(...permissions)
		},
	}
}

// Create a standalone lambda from a prebuilt bundle that ships with the
// cli, for internal handlers that must run outside of the app bundle.
export const createPrebuildLambdaFunction = (
	parentGroup: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	props: {
		bundleFile: string // The file path of the prebuilt zip archive.
		bundleHash: string // The file path of the prebuilt bundle hash.
		runtime: aws.lambda.FunctionInput['runtime']
		handler: string
		timeout?: Duration
		memorySize?: Size
		architecture?: 'arm64' | 'x86_64'
		vpc?: boolean
		log?: {
			format?: 'text' | 'json'
			level?: string
			system?: string
			retention?: Duration
		}
	}
) => {
	let name: string
	let roleName: string

	const group = new Group(parentGroup, 'function', id)

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
			resourceName: id,
			postfix: ctx.appId,
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
			resourceName: id,
			postfix: ctx.appId,
		})
	}

	const sourceHash = $file(props.bundleHash)

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `lambda/${name}.zip`,
			source: relativePath(props.bundleFile),
			sourceHash,
		},
		{
			replaceOnChanges: ['bucket', 'key'],
		}
	)

	// ------------------------------------------------------------
	// The lambda role & permissions.

	const role = new aws.iam.Role(group, 'role', {
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
	const statementDeps: Set<any> = new Set()

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)

		for (const dep of findInputDeps(permissions)) {
			statementDeps.add(dep)
		}
	}

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		policy: new Output(statementDeps, async (resolve: (value: string) => void) => {
			const list = (await resolveInputs(statements)) as PolicyStatement[]

			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: compactPolicyStatements(list).map(statement => ({
						Effect: pascalCase(statement.effect ?? 'allow'),
						Action: statement.actions,
						Resource: statement.resources,
						Condition: statement.conditions,
					})),
				})
			)
		}),
	})

	// ------------------------------------------------------------
	// VPC

	const dependsOn: Resource[] = [policy]

	if (props.vpc) {
		dependsOn.push(
			new aws.iam.RolePolicy(group, 'vpc-policy', {
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
								'ec2:DescribeSubnets',
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
	// The lambda function.

	const variables: Record<string, Input<string>> = {}
	const logFormats = {
		text: 'Text',
		json: 'JSON',
	}

	const lambda = new aws.lambda.Function(
		group,
		'function',
		{
			functionName: name,
			description: name,
			role: role.arn,
			runtime: props.runtime,
			handler: props.handler,
			timeout: toSeconds(props.timeout ?? seconds(10)),
			memorySize: toMebibytes(props.memorySize ?? mebibytes(128)),
			architectures: [props.architecture ?? 'arm64'],

			timeouts: {
				create: '30s',
				update: '30s',
				delete: '30s',
			},

			s3Bucket: code.bucket,
			s3ObjectVersion: code.versionId,
			s3Key: code.key.pipe(name => {
				if (name.startsWith('/')) {
					return name.substring(1)
				}

				return name
			}),

			sourceCodeHash: sourceHash,

			environment: {
				variables,
			},

			vpcConfig: props.vpc
				? {
						securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
						subnetIds: ctx.shared.get('vpc', 'private-subnets'),
						ipv6AllowedForDualStack: true,
					}
				: undefined,

			loggingConfig: {
				logGroup: `/aws/lambda/${name}`,
				logFormat: logFormats[props.log?.format ?? 'json'],
				applicationLogLevel: (props.log?.format ?? 'json') === 'json' ? props.log?.level?.toUpperCase() : undefined,
				systemLogLevel: (props.log?.format ?? 'json') === 'json' ? props.log?.system?.toUpperCase() : undefined,
			},
		},
		{
			dependsOn,
		}
	)

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	variables.REGION = ctx.appConfig.region
	variables.STAGE = ctx.appConfig.stage ?? 'default'

	if ('stackConfig' in ctx) {
		variables.STACK = ctx.stackConfig.name
	}

	if (props.vpc) {
		// Tell all aws clients to use the dualstack endpoint when the
		// lambda runs inside the vpc.
		variables.AWS_USE_DUALSTACK_ENDPOINT = 'true'
	}

	// ------------------------------------------------------------
	// Logging

	const retention = props.log?.retention

	if (retention && retention.value > 0n) {
		const logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(retention),
		})

		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})

		if (ctx.shared.has('on-error-log', 'subscriber-arn')) {
			new aws.cloudwatch.LogSubscriptionFilter(
				group,
				'on-error-log',
				{
					name: 'error-log-subscription',
					destinationArn: ctx.shared.get('on-error-log', 'subscriber-arn'),
					logGroupName: logGroup.name,
					filterPattern,
				},
				{
					dependsOn: [ctx.shared.get('on-error-log', 'permission')],
				}
			)
		}
	}

	return {
		name,
		group,
		lambda,
		policy,
		code,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(...permissions: Permission[]) {
			addPermission(...permissions)
		},
	}
}
