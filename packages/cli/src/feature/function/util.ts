import { createHash } from 'crypto'
import { readdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { days, Duration, seconds, toDays, toSeconds } from '@awsless/duration'
import { mebibytes, Size, toMebibytes } from '@awsless/size'
import { generateFileHash } from '@awsless/ts-file-cache'
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
import { filterPattern } from '../on-error-log/util.js'
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

// Build the code of a stand-alone lambda into a zip at deploy time.
// A wrapper file provides a createHandler factory that receives the
// user handler as the lambda entry, so features can compile their own
// handler code together with the code of a user.
//
// The env vars added through the returned addEnv are baked into the
// zip as an awsless-env.mjs file, like the bundle does, so a lambda
// can outgrow the 4KB lambda env limit. The generated entry always
// exports "default", so the lambda handler is "index.default".
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
		const fingerprint = createHash('sha1')
			.update(await generateFileHash(workspace, props.code.file))
			.update(props.wrapper ? await readFile(props.wrapper) : '')
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

			await writeFile(entryFile, entry)

			const result = await bundleTypeScriptWithRolldown({
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

			await temp.delete()

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

	// The pure build hash, without the env: the sourcemaps of a build
	// key on it, so an env-only change never re-uploads or re-keys them.
	const buildHash = new Output<string>(new Set(), async (resolve: (value: string) => void) => {
		resolve((await readFile(getBuildPath('function', name, 'HASH'), 'utf8')).trim())
	})

	return {
		zipFile,
		sourceHash,
		buildHash,
		filesDir: getBuildPath('function', name, 'files'),
		addEnv,
	}
}

// The sourcemaps of a lambda build upload next to the code, keyed by
// name & build hash - together with an index object mapping the
// published lambda version to that prefix, so the on-error-log handler
// finds the exact maps of the version that errored with plain s3 reads.
export const deployFunctionSourcemaps = (
	group: Group,
	ctx: StackContext | AppContext,
	props: {
		name: string
		buildHash: Input<string>
		filesDir: string
		// The published version of the deployed lambda ("$LATEST" for an
		// unpublished one, whose index simply tracks the newest deploy).
		version: Input<string>
	}
) => {
	new SourcemapDeployment(group, 'sourcemaps', {
		bucket: ctx.shared.get('asset', 'bucket').name,
		name: props.name,
		hash: props.buildHash,
		source: relativePath(props.filesDir),
		version: props.version,
	})
}

// Deploy a stack function as its own stand-alone lambda, like the old
// awsless did for every function. Callers invoke it directly by name, so
// it deploys in place & doesn't participate in blue-green deployments.
export const createLambdaFunction = (ctx: StackContext, id: string, local: StackFunctionProps) => {
	const group = new Group(ctx.stack, 'function', id)
	const props = deepmerge(ctx.appConfig.function, local)

	if (props.runtime === 'container') {
		throw new FileError(ctx.stackConfig.file, `The "container" runtime isn't supported for stack functions.`)
	}

	for (const layerId of props.layers ?? []) {
		if (!(layerId in (ctx.appConfig.layers ?? {}))) {
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

	const build = registerFunctionBuild(ctx, name, {
		code: local.code,
		handler: props.handler,
		external: (props.layers ?? []).flatMap(layerId => ctx.shared.entry('layer', 'packages', layerId)),
	})

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `lambda/${name}.zip`,
			source: relativePath(build.zipFile),
			sourceHash: build.sourceHash,
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

	const sandboxed = typeof local.sandbox !== 'undefined' && local.sandbox !== false

	if (sandboxed) {
		// Sandboxed functions only receive their own explicit permissions,
		// without the app wide grants or the app level defaults. So they
		// can't touch any other lambda or resource inside the app.
		addPermission(...(local.permissions ?? []))
	} else {
		addPermission(...(props.permissions ?? []))
		ctx.onPermission(addPermission)
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
			handler: 'index.default', // The generated build entry always exports default.
			publish: true,
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
			s3Key: code.key,

			sourceCodeHash: build.sourceHash,

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
			import: ctx.import ? name : undefined,
		}
	)

	deployFunctionSourcemaps(group, ctx, {
		name,
		buildHash: build.buildHash,
		filesDir: build.filesDir,
		version: lambda.version,
	})

	// ------------------------------------------------------------
	// Every deployment tags the published version with its id alias &
	// the live alias follows promotions, like the bundle. Failed async
	// invokes land in the global on-failure bucket, so they aren't
	// dropped after the retries run out.

	const onFailure = getGlobalOnFailure(ctx)
	const { deployment } = createDeploymentAliases(group, ctx, {
		lambda,
		policy,
		onFailureArn: onFailure,
	})

	if (onFailure) {
		addPermission({
			actions: ['s3:PutObject', 's3:ListBucket'],
			resources: [onFailure, $interpolate`${onFailure}/*`],
			conditions: {
				StringEquals: {
					's3:ResourceAccount': ctx.accountId,
				},
			},
		})
	}

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	variables.REGION = ctx.appConfig.region
	variables.STAGE = ctx.appConfig.stage ?? 'default'
	variables.STACK = ctx.stackConfig.name

	if (props.vpc) {
		variables.AWS_USE_DUALSTACK_ENDPOINT = 'true'
	}

	for (const [key, value] of Object.entries(props.environment ?? {})) {
		variables[key] = value
	}

	// The app wide env is baked into the code zip, since the lambda env
	// is limited to 4KB. Sandboxed functions receive it too: the env only
	// names resources, while IAM keeps everything outside the allowlisted
	// routes unreachable.
	ctx.onEnv(build.addEnv)
	ctx.onBind(build.addEnv)

	// ------------------------------------------------------------
	// Sandbox

	if (sandboxed) {
		// The real lambda env wins over the baked app env, so the config
		// prefetch only sees the sandbox's allowlisted configs instead of
		// the app wide config list.
		const configs = (typeof local.sandbox === 'object' && local.sandbox.configs) || []

		variables.CONFIGS = configs.join(',')

		if (configs.length > 0) {
			addPermission({
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
	}

	if (typeof local.sandbox === 'object') {
		// The bundle route keys are kebab-cased, so the allowlist entries
		// are normalized the same way to make the proxy route match exact.
		const routes = [
			...(local.sandbox.functions ?? []).map(route => {
				const [stack, resource] = route.split(':')
				return `${kebabCase(stack!)}:function:${kebabCase(resource!)}`
			}),
			...(local.sandbox.tasks ?? []).map(route => {
				const [stack, resource] = route.split(':')
				return `${kebabCase(stack!)}:task:${kebabCase(resource!)}`
			}),
		]

		if (routes.length > 0) {
			// The allowlisted routes are served by a private sandbox proxy,
			// the only lambda the sandboxed function is allowed to invoke.
			// The proxy forwards allowlisted routes to the live bundle.
			const bundle = ctx.shared.get('bundle', 'main')
			const distDir = dirname(fileURLToPath(import.meta.url))

			const proxy = createLambdaFunctionFromZip(group, ctx, 'function', `${id}-proxy`, {
				zipFile: join(distDir, '/prebuild/sandbox-proxy/bundle.zip'),
				sourceHash: $file(join(distDir, '/prebuild/sandbox-proxy/HASH')),
				runtime: 'nodejs24.x',
				handler: 'index.default',
				publish: true,

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

			// The proxy is versioned & promoted like every other stand-alone
			// lambda, so a staged deploy never touches the live allowlist.
			createDeploymentAliases(proxy.group, ctx, {
				lambda: proxy.lambda,
				policy: proxy.policy,
			})

			proxy.addPermission({
				actions: ['lambda:InvokeFunction'],
				resources: [bundle.lambda.arn.pipe(arn => `${arn}:*`)],
			})

			variables.SANDBOX_PROXY = proxy.name

			// Qualified invokes only, so sandboxed code can never reach the
			// staged $LATEST allowlist before its deployment promotes.
			addPermission({
				actions: ['lambda:InvokeFunction'],
				resources: [proxy.lambda.arn.pipe(arn => `${arn}:*`)],
			})
		}
	}

	// ------------------------------------------------------------
	// Logging

	if (props.log.retention.value > 0n) {
		const logGroup = new aws.cloudwatch.LogGroup(
			group,
			'log',
			{
				name: `/aws/lambda/${name}`,
				retentionInDays: toDays(props.log.retention),
			},
			{
				import: ctx.import ? `/aws/lambda/${name}` : undefined,
			}
		)

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
					replaceOnChanges: ['destinationArn'],
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
		deployment,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(...permissions: Permission[]) {
			addPermission(...permissions)
		},
	}
}

// Create a stand-alone lambda from a code zip, for internal handlers
// that must run outside of the app bundle. The zip either ships with
// the cli or comes from a registered function build.
export const createLambdaFunctionFromZip = (
	parentGroup: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	props: {
		zipFile: string // The file path of the zip archive.
		sourceHash: Input<string> // The content hash of the zip archive.
		runtime: aws.lambda.FunctionInput['runtime']
		handler: string
		publish?: boolean
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

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `lambda/${name}.zip`,
			source: relativePath(props.zipFile),
			sourceHash: props.sourceHash,
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
			publish: props.publish,
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
			s3Key: code.key,

			sourceCodeHash: props.sourceHash,

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
				applicationLogLevel:
					(props.log?.format ?? 'json') === 'json' ? props.log?.level?.toUpperCase() : undefined,
				systemLogLevel: (props.log?.format ?? 'json') === 'json' ? props.log?.system?.toUpperCase() : undefined,
			},
		},
		{
			dependsOn,
			import: ctx.import ? name : undefined,
		}
	)

	// ------------------------------------------------------------
	// Failed async invokes land in the global on-failure bucket, so
	// they aren't dropped after the retries run out.

	const onFailure = getGlobalOnFailure(ctx)

	if (onFailure) {
		new aws.lambda.FunctionEventInvokeConfig(
			group,
			'async',
			{
				functionName: lambda.functionName,
				maximumRetryAttempts: 2,
				destinationConfig: {
					onFailure: {
						destination: onFailure,
					},
				},
			},
			{
				dependsOn: [policy],
			}
		)

		addPermission({
			actions: ['s3:PutObject', 's3:ListBucket'],
			resources: [onFailure, $interpolate`${onFailure}/*`],
			conditions: {
				StringEquals: {
					's3:ResourceAccount': ctx.accountId,
				},
			},
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

	const retention = props.log?.retention

	if (retention && retention.value > 0n) {
		const logGroup = new aws.cloudwatch.LogGroup(
			group,
			'log',
			{
				name: `/aws/lambda/${name}`,
				retentionInDays: toDays(retention),
			},
			{
				import: ctx.import ? `/aws/lambda/${name}` : undefined,
			}
		)

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
					replaceOnChanges: ['destinationArn'],
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
