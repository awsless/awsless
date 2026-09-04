import { createHash } from 'crypto'
import { readdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { days, Duration, seconds, toSeconds } from '@awsless/duration'
import { mebibytes, Size, toMebibytes } from '@awsless/size'
import { generateDependencyHash, generateFileHash } from '@awsless/ts-file-cache'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, resolveInputs, Resource } from '@terraforge/core'
import { kebabCase } from 'change-case'
import deepmerge from 'deepmerge'
import { getBuildPath } from '../../build/index.js'
import { FileError } from '../../error.js'
import { AppContext, Permission, StackContext } from '../../feature.js'
import { DeploymentAlias, LiveTarget } from '../../formation/lambda.js'
import { SourcemapDeployment } from '../../formation/s3.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { LIVE_LAMBDA_ALIAS } from '../../util/lambda.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { formatPolicyDocument } from '../../util/policy.js'
import { configParameterPrefix } from '../../util/ssm.js'
import { createTempFolder } from '../../util/temp.js'
import { bundleTypeScriptWithRolldown } from '../bundle/build/rolldown.js'
import { zipFiles } from '../bundle/build/zip.js'
import { PolicyStatement } from '../bundle/policy.js'
import { parseExportName } from '../bundle/util.js'
import { createLogGroup } from '../on-error-log/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
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

// Every deployment tags the published version with its id alias & the
// live alias follows promotions.
export const createDeploymentAliases = (
	group: Group,
	ctx: StackContext | AppContext,
	props: {
		lambda: aws.lambda.Function
		policy: aws.iam.RolePolicy
		onFailureArn?: Output<string>
	}
): { deployment: Resource; liveAlias: aws.lambda.Alias } => {
	const deployment = new DeploymentAlias(
		group,
		'deployment',
		{
			functionName: props.lambda.functionName,
			functionVersion: props.lambda.version,
			id: ctx.deploymentId ?? 'local-0',
			onFailureArn: props.onFailureArn,
		},
		{
			dependsOn: [props.policy],
		}
	)

	const liveTarget = new LiveTarget(group, 'live-target', {
		functionName: props.lambda.functionName,
		functionVersion: props.lambda.version,
	})

	const liveAlias = new aws.lambda.Alias(
		group,
		'live',
		{
			name: LIVE_LAMBDA_ALIAS,
			description: liveTarget.liveDescription,
			functionName: props.lambda.functionName,
			functionVersion: liveTarget.liveVersion,
		},
		{
			dependsOn: [props.policy],
		}
	)

	if (props.onFailureArn) {
		new aws.lambda.FunctionEventInvokeConfig(
			group,
			'async',
			{
				functionName: props.lambda.functionName,
				qualifier: liveAlias.name,
				maximumRetryAttempts: 2,
				destinationConfig: {
					onFailure: {
						destination: props.onFailureArn,
					},
				},
			},
			{
				dependsOn: [props.policy],
			}
		)
	}

	return { deployment, liveAlias }
}

type FunctionCode = {
	file: string
	minify?: boolean
	external?: string[]
	importAsString?: string[]
	moduleSideEffects?: string[]
}

// The env added through addEnv is baked into the zip like the bundle
// does, so a lambda can outgrow the 4KB lambda env limit.
export const registerFunctionBuild = (
	ctx: StackContext | AppContext,
	name: string,
	props: {
		code: FunctionCode
		handler?: string
		external?: string[]
		wrapper?: string
	}
) => {
	const exportName = parseExportName(props.handler ?? ctx.appConfig.function.handler)

	ctx.registerBuild('function', name, async (build, { workspace }) => {
		// The entry & the prebuilt wrappers import the awsless package from
		// node_modules, outside the workspace file hashes.
		const fingerprint = createHash('sha1')
			.update(await generateFileHash(workspace, props.code.file))
			.update(props.wrapper ? await readFile(props.wrapper) : '')
			.update(generateDependencyHash(workspace, 'awsless') ?? '')
			.update(
				JSON.stringify([
					//
					exportName,
					props.code.minify,
					props.code.external,
					props.code.importAsString,
					props.code.moduleSideEffects,
					props.external,
				])
			)
			.digest('hex')

		return build(fingerprint, async write => {
			const handlerImport = `const { ${exportName === 'default' ? 'default: handler' : `${exportName}: handler`} } = await import(${JSON.stringify(props.code.file)})`

			// The env is applied before the handler modules are loaded, so
			// module level env reads work & the real lambda environment
			// always wins over the bundled environment.
			const entry = `import env from './awsless-env.mjs'

for (const name in env) {
	process.env[name] ??= env[name]
}

const { captureInvokedQualifier } = await import('awsless')
${
	props.wrapper
		? `const { createHandler } = await import(${JSON.stringify(props.wrapper)})
${handlerImport}

const handle = createHandler(handler)`
		: `${handlerImport}

const handle = handler`
}

export default (event, context) => {
	captureInvokedQualifier(context)

	return handle(event, context)
}
`
			const temp = await createTempFolder(name)
			const entryFile = join(temp.path, 'entry.ts')

			let result

			try {
				await writeFile(entryFile, entry)

				result = await bundleTypeScriptWithRolldown({
					file: entryFile,
					minify: props.code.minify,
					external: [
						// The env file is generated at deploy time.
						'./awsless-env.mjs',
						...(props.code.external ?? []),
						...(props.external ?? []),
					],
					moduleSideEffects: props.code.moduleSideEffects,
					importAsString: props.code.importAsString,
				})
			} finally {
				await temp.delete()
			}

			// Clear out the stale chunks from the previous build.
			await rm(getBuildPath('function', name, 'files'), { recursive: true, force: true })

			await Promise.all([
				write('HASH', result.hash),
				...result.files.map(file => write(`files/${file.name}`, file.code)),
				...result.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
			])

			return {
				size: formatByteSize(result.files.reduce((total, file) => total + file.code.byteLength, 0)),
			}
		})
	})

	// ------------------------------------------------------------
	// Resolve the env at deploy time & zip it into the build output
	// as an awsless-env.mjs file.

	const env: Record<string, Input<string>> = {}
	const envDeps = new Set<any>()

	const addEnv = (name: string, value: Input<string>) => {
		env[name] = value

		for (const dep of findInputDeps(value)) {
			envDeps.add(dep)
		}
	}

	const zipFile = getBuildPath('function', name, 'bundle.zip')

	const sourceHash = new Output<string>(envDeps, async (resolve: (value: string) => void) => {
		const buildHash = await readFile(getBuildPath('function', name, 'HASH'), 'utf8')
		const vars = await resolveInputs(env)
		const sorted = Object.fromEntries(Object.entries(vars).toSorted(([a], [b]) => a.localeCompare(b)))
		const envFile = `export default ${JSON.stringify(sorted, undefined, '\t')}
`

		const dir = getBuildPath('function', name, 'files')
		const files = await readdir(dir)
		const archive = await zipFiles([
			...files.filter(file => !file.endsWith('.map')).map(file => ({ name: file, path: join(dir, file) })),
			{ name: 'awsless-env.mjs', code: Buffer.from(envFile, 'utf8') },
		])

		await writeFile(zipFile, archive)

		resolve(createHash('sha1').update(buildHash).update(envFile).digest('hex'))
	})

	return {
		zipFile,
		sourceHash,
		addEnv,
	}
}

// The failure plane never preloads configs, so a drifted config value
// can't kill error reporting at init.
export const addEnvWithoutConfigs = (build: { addEnv: (name: string, value: Input<string>) => void }) => {
	return (name: string, value: Input<string>) => {
		if (name !== 'CONFIGS') {
			build.addEnv(name, value)
		}
	}
}

// Upload a build's sourcemaps plus a version index object, so the
// on-error-log handler finds the erroring version's maps with plain
// s3 reads. Without an onErrorLog consumer nothing ever reads them.
export const deployFunctionSourcemaps = (
	group: Group,
	ctx: StackContext | AppContext,
	props: {
		name: string
		buildType?: 'bundle' | 'function'
		// The published version ("$LATEST" for an unpublished lambda,
		// whose index simply tracks the newest deploy).
		version: Input<string>
	}
) => {
	if (!ctx.appConfig.onErrorLog) {
		return
	}

	const buildType = props.buildType ?? 'function'

	// The pure build hash, without the env: an env-only change never
	// re-uploads or re-keys the maps.
	const buildHash = new Output<string>(new Set(), async (resolve: (value: string) => void) => {
		resolve((await readFile(getBuildPath(buildType, props.name, 'HASH'), 'utf8')).trim())
	})

	new SourcemapDeployment(group, 'sourcemaps', {
		bucket: ctx.shared.get('asset', 'bucket').name,
		name: props.name,
		hash: buildHash,
		source: relativePath(getBuildPath(buildType, props.name, 'files')),
		version: props.version,
	})
}

// ------------------------------------------------------------
// The stand-alone lambda factory

export type LambdaLogProps = {
	format?: 'text' | 'json'
	level?: string
	system?: string
	retention?: Duration
	// Opt out for handlers whose log group subscribes to the error
	// log at a later point.
	errorLog?: boolean
}

export type LambdaProps = {
	code: {
		zipFile: string // The file path of the zip archive.
		sourceHash: Input<string> // The content hash of the zip archive.
	}
	runtime: aws.lambda.FunctionInput['runtime']
	handler: string
	description?: string
	timeout?: Duration
	memorySize?: Size
	architecture?: 'arm64' | 'x86_64'
	ephemeralStorageSize?: Size
	reserved?: number
	layers?: Input<string>[]
	vpc?: boolean
	log?: LambdaLogProps

	// A versioned lambda publishes every deploy & promotes through the
	// live alias like the bundle, so failed async invokes report from
	// the alias. An unversioned lambda deploys in place at $LATEST.
	versioned?: boolean

	// Where failed async invokes land: the global on-failure bucket by
	// default. False opts out.
	onFailure?: { arn: Output<string>; kind: 'bucket' | 'queue' } | false
}

// The physical name of a lambda: stack scoped inside a stack, app
// scoped otherwise.
export const formatLambdaName = (ctx: StackContext | AppContext, ns: string, id: string, postfix?: string) => {
	if ('stack' in ctx) {
		return formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
			postfix,
		})
	}

	return formatGlobalResourceName({
		appName: ctx.app.name,
		resourceType: ns,
		resourceName: id,
		postfix,
	})
}

const logFormats = {
	text: 'Text',
	json: 'JSON',
}

// The log levels only apply to structured json logs.
export const formatLoggingConfig = (name: string, log: LambdaLogProps | undefined) => {
	const format = log?.format ?? 'json'

	return {
		logGroup: `/aws/lambda/${name}`,
		logFormat: logFormats[format],
		applicationLogLevel: format === 'json' ? log?.level?.toUpperCase() : undefined,
		systemLogLevel: format === 'json' ? log?.system?.toUpperCase() : undefined,
	}
}

// Create a stand-alone lambda from a code zip: a stack function, or an
// internal handler that must run outside of the app bundle. The zip
// either ships with the cli or comes from a registered function build.
export const createLambda = (
	parentGroup: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	props: LambdaProps
) => {
	const group = new Group(parentGroup, 'function', id)
	const name = formatLambdaName(ctx, ns, id)
	// The readable stack function name blows past the 64 character IAM
	// limit for ordinary ids, so the role name is a hash instead.
	const roleName =
		'stack' in ctx
			? shortId(`${ctx.app.name}:${ctx.stack.name}:${ns}:${id}:${ctx.appId}`)
			: formatLambdaName(ctx, ns, id, ctx.appId)

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `lambda/${name}.zip`,
			source: relativePath(props.code.zipFile),
			sourceHash: props.code.sourceHash,
		},
		{
			replaceOnChanges: ['bucket', 'key'],
		}
	)

	// ------------------------------------------------------------
	// The lambda role & permissions.

	const role = new aws.iam.Role(
		group,
		'role',
		{
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
		},
		{
			import: ctx.import ? roleName : undefined,
		}
	)

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

			resolve(formatPolicyDocument(list))
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

	const lambda = new aws.lambda.Function(
		group,
		'function',
		{
			functionName: name,
			description: props.description ?? name,
			role: role.arn,
			runtime: props.runtime,
			handler: props.handler,
			publish: props.versioned,
			timeout: toSeconds(props.timeout ?? seconds(10)),
			memorySize: toMebibytes(props.memorySize ?? mebibytes(128)),
			architectures: [props.architecture ?? 'arm64'],
			reservedConcurrentExecutions: props.reserved,
			ephemeralStorage: props.ephemeralStorageSize
				? {
						size: toMebibytes(props.ephemeralStorageSize),
					}
				: undefined,
			layers: props.layers,

			// The first vpc attachment of a lambda takes minutes, while a
			// delete only waits for the function itself.
			timeouts: {
				create: '5m',
				update: '5m',
				delete: '2m',
			},

			s3Bucket: code.bucket,
			s3ObjectVersion: code.versionId,
			s3Key: code.key,

			sourceCodeHash: props.code.sourceHash,

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

			loggingConfig: formatLoggingConfig(name, props.log),
		},
		{
			dependsOn,
			import: ctx.import ? name : undefined,
		}
	)

	// ------------------------------------------------------------
	// Failed async invokes land in the global on-failure bucket, so
	// they aren't dropped after the retries run out.

	const globalOnFailure = getGlobalOnFailure(ctx)
	const onFailure =
		props.onFailure === false
			? undefined
			: (props.onFailure ?? (globalOnFailure ? { arn: globalOnFailure, kind: 'bucket' as const } : undefined))
	let deployment: Resource | undefined
	let liveAlias: aws.lambda.Alias | undefined

	if (props.versioned) {
		const aliases = createDeploymentAliases(group, ctx, {
			lambda,
			policy,
			onFailureArn: onFailure?.arn,
		})

		deployment = aliases.deployment
		liveAlias = aliases.liveAlias
	} else if (onFailure) {
		new aws.lambda.FunctionEventInvokeConfig(
			group,
			'async',
			{
				functionName: lambda.functionName,
				maximumRetryAttempts: 2,
				destinationConfig: {
					onFailure: {
						destination: onFailure.arn,
					},
				},
			},
			{
				dependsOn: [policy],
			}
		)
	}

	if (onFailure?.kind === 'bucket') {
		addPermission({
			actions: ['s3:PutObject', 's3:ListBucket'],
			resources: [onFailure.arn, $interpolate`${onFailure.arn}/*`],
			conditions: {
				StringEquals: {
					's3:ResourceAccount': ctx.accountId,
				},
			},
		})
	}

	if (onFailure?.kind === 'queue') {
		addPermission({
			actions: ['sqs:SendMessage'],
			resources: [onFailure.arn],
		})
	}

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

	const logGroup = createLogGroup(group, ctx, {
		name: `/aws/lambda/${name}`,
		retention: props.log?.retention,
		errorLog: props.log?.errorLog,
	})

	if (logGroup) {
		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})
	}

	return {
		name,
		group,
		lambda,
		role,
		policy,
		code,
		logGroup,
		deployment,
		liveAlias,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(...permissions: Permission[]) {
			addPermission(...permissions)
		},
	}
}

export type Lambda = ReturnType<typeof createLambda>

// ------------------------------------------------------------
// Sandboxing

type Sandbox = Exclude<NonNullable<StackFunctionProps['sandbox']>, false>

// A sandboxed function only reaches the configs & bundle routes on its
// allowlist. The allowlisted routes are served by a private sandbox
// proxy, the only lambda the sandboxed function is allowed to invoke.
const applySandbox = (ctx: StackContext, id: string, sandbox: Sandbox, fn: Lambda) => {
	// The real lambda env wins over the baked app env, so the config
	// prefetch only sees the sandbox's allowlisted configs instead of
	// the app wide config list.
	const configs = (typeof sandbox === 'object' && sandbox.configs) || []

	fn.setEnvironment('CONFIGS', configs.join(','))

	if (configs.length > 0) {
		fn.addPermission({
			actions: [
				//
				'ssm:GetParameter',
				'ssm:GetParameters',
				'ssm:GetParametersByPath',
				'ssm:GetParameterHistory',
			],
			resources: configs.map(configName => {
				return `arn:aws:ssm:${ctx.appConfig.region}:${ctx.accountId}:parameter${configParameterPrefix(
					ctx.app.name
				)}/${configName}`
			}),
		})
	}

	if (typeof sandbox !== 'object') {
		return
	}

	// The bundle route keys are kebab-cased, so the allowlist entries
	// are normalized the same way to make the proxy route match exact.
	const routes = [
		...(sandbox.functions ?? []).map(route => {
			const [stack, resource] = route.split(':')
			return `${kebabCase(stack!)}:function:${kebabCase(resource!)}`
		}),
		...(sandbox.tasks ?? []).map(route => {
			const [stack, resource] = route.split(':')
			return `${kebabCase(stack!)}:task:${kebabCase(resource!)}`
		}),
	]

	if (routes.length === 0) {
		return
	}

	const bundle = ctx.shared.get('bundle', 'main')
	const distDir = dirname(fileURLToPath(import.meta.url))

	// The proxy has its own namespace, so it can never collide with a
	// user function. It's versioned & promoted like every other
	// stand-alone lambda, so a staged deploy never touches the live
	// allowlist.
	const proxy = createLambda(fn.group, ctx, 'sandbox-proxy', id, {
		code: {
			zipFile: join(distDir, '/prebuild/sandbox-proxy/bundle.zip'),
			sourceHash: $file(join(distDir, '/prebuild/sandbox-proxy/HASH')),
		},
		runtime: 'nodejs24.x',
		handler: 'index.default',
		versioned: true,

		memorySize: mebibytes(512),

		// The proxy forwards synchronously, so it needs at least the
		// same timeout as the bundle.
		timeout: ctx.appConfig.function.timeout,

		log: {
			format: 'json',
			level: 'warn',
			system: 'info',
			retention: days(3),
		},
	})

	proxy.setEnvironment('SANDBOX_ROUTES', JSON.stringify(routes))

	proxy.addPermission({
		actions: ['lambda:InvokeFunction'],
		resources: [bundle.lambda.arn.pipe(arn => `${arn}:*`)],
	})

	fn.setEnvironment('SANDBOX_PROXY', proxy.name)

	// Qualified invokes only, so sandboxed code can never reach the
	// staged $LATEST allowlist before its deployment promotes.
	fn.addPermission({
		actions: ['lambda:InvokeFunction'],
		resources: [proxy.lambda.arn.pipe(arn => `${arn}:*`)],
	})
}

// ------------------------------------------------------------
// Stack functions

// Deploy a stack function as its own stand-alone lambda, like the old
// awsless did for every function. Callers invoke it directly by name, so
// it deploys in place & doesn't participate in blue-green deployments.
export const createLambdaFunction = (ctx: StackContext, id: string, local: StackFunctionProps) => {
	const props = deepmerge(ctx.appConfig.function, local)

	if (props.runtime === 'container') {
		throw new FileError(ctx.stackConfig.file, `The "container" runtime isn't supported for stack functions.`)
	}

	for (const layerId of props.layers ?? []) {
		if (!(layerId in (ctx.appConfig.layers ?? {}))) {
			throw new FileError(ctx.stackConfig.file, `Layer "${layerId}" is not defined in app.json`)
		}
	}

	const name = formatLambdaName(ctx, 'function', id)

	const build = registerFunctionBuild(ctx, name, {
		code: local.code,
		handler: props.handler,
		external: (props.layers ?? []).flatMap(layerId => ctx.shared.entry('layer', 'packages', layerId)),
	})

	const fn = createLambda(ctx.stack, ctx, 'function', id, {
		code: build,
		runtime: props.runtime,
		handler: 'index.default', // The generated build entry always exports default.
		description: props.description,
		timeout: props.timeout,
		memorySize: props.memorySize,
		architecture: props.architecture,
		ephemeralStorageSize: props.ephemeralStorageSize,
		reserved: props.reserved,
		layers: props.layers?.map(layerId => ctx.shared.entry('layer', 'arn', layerId)),
		vpc: props.vpc,
		log: props.log,
		versioned: true,
	})

	deployFunctionSourcemaps(fn.group, ctx, {
		name,
		version: fn.lambda.version,
	})

	// ------------------------------------------------------------
	// Permissions

	const sandbox = local.sandbox !== undefined && local.sandbox !== false ? local.sandbox : undefined

	if (sandbox) {
		// Sandboxed functions only receive their own explicit permissions,
		// without the app wide grants or the app level defaults. So they
		// can't touch any other lambda or resource inside the app.
		fn.addPermission(...(local.permissions ?? []))
	} else {
		fn.addPermission(...(props.permissions ?? []))
		ctx.onPermission(permission => fn.addPermission(permission))
		ctx.shared.add('function', 'role', name, fn.role)
	}

	// ------------------------------------------------------------
	// Env Vars

	for (const [key, value] of Object.entries(props.environment ?? {})) {
		fn.setEnvironment(key, value)
	}

	// The app wide env is baked into the code zip, since the lambda env
	// is limited to 4KB. Sandboxed functions receive it too: the env only
	// names resources, while IAM keeps everything outside the allowlisted
	// routes unreachable.
	ctx.onEnv(build.addEnv)
	ctx.onBind(build.addEnv)

	if (sandbox) {
		applySandbox(ctx, id, sandbox, fn)
	}

	return {
		...fn,
		deployment: fn.deployment!,
	}
}
