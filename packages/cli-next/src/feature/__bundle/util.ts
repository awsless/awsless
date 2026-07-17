import { toDays, toSeconds } from '@awsless/duration'
import { toMebibytes } from '@awsless/size'
import { generateFileHash } from '@awsless/ts-file-cache'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, resolveInputs } from '@terraforge/core'
import { kebabCase, pascalCase } from 'change-case'
import { createHash } from 'crypto'
import { readdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Builder, getBuildPath } from '../../build/index.js'
import { AppContext, Permission } from '../../feature.js'
import { BundleDeployment } from '../../formation/lambda.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { createTempFolder } from '../../util/temp.js'
import { FunctionDefaultProps } from '../function/schema.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { bundleTypeScriptWithRolldown } from './build/rolldown.js'
import { zipFiles } from './build/zip.js'

export const formatRouteKey = (stackName: string, resourceType: string, resourceName: string) => {
	return [stackName, resourceType, resourceName].map(v => kebabCase(v)).join(':')
}

export const parseExportName = (handler: string) => {
	return handler.split('.').slice(1).join('.') || 'default'
}

export type BundleHandler = {
	routeKey: string

	// The file path of the handler code.
	file: string

	// The name of the exported method within the handler code.
	exportName: string

	external?: string[]
	importAsString?: string[]
}

type BuildBundleProps = {
	name: string
	minify?: boolean
	external?: string[]
	handlers: BundleHandler[]

	// Overwrite the bundle runtime location for testing purposes.
	runtime?: string
}

// The internal handlers are precompiled into the dist folder.
export const internalHandler = (name: string) => {
	return join(dirname(fileURLToPath(import.meta.url)), `handlers/${name}.mjs`)
}

const bundleRuntime = internalHandler('bundle')

// Build all handlers into a single code bundle behind a generated entry file.

export const buildBundle = (props: BuildBundleProps): Builder => {
	return async (build, { workspace }) => {
		const runtime = props.runtime ?? bundleRuntime
		const handlers = [...props.handlers].sort((a, b) => a.routeKey.localeCompare(b.routeKey))

		// The entry file lazily imports every handler behind its route key.
		// The route query virtualizes the handler file per route, so module
		// level state is never shared between routes using the same file.
		const entries = handlers.map(({ routeKey, file, exportName }) => {
			const load = `() => import(${JSON.stringify(`${file}?awsless-route=${encodeURIComponent(routeKey)}`)}).then(module => module[${JSON.stringify(exportName)}])`

			return `\t${JSON.stringify(routeKey)}: ${load},`
		})

		const entry = `import { createBundle } from ${JSON.stringify(runtime)}
import env from './awsless-env.mjs'

export default createBundle(env, {
${entries.join('\n')}
})
`
		const hashes = await Promise.all([
			readFile(runtime),
			...handlers.map(handler =>
				dirname(handler.file) === dirname(runtime)
					? readFile(handler.file)
					: generateFileHash(workspace, handler.file)
			),
		])

		const hash = createHash('sha1')
			.update(entry)
			.update(JSON.stringify([props.external, props.minify, handlers.map(h => [h.external, h.importAsString])]))

		for (const item of hashes) {
			hash.update(item)
		}

		const fingerprint = hash.digest('hex')

		return build(fingerprint, async write => {
			const temp = await createTempFolder(`bundle--${props.name}`)
			const entryFile = join(temp.path, 'entry.ts')

			await writeFile(entryFile, entry)

			const importAsString = handlers.flatMap(handler => handler.importAsString ?? [])
			const bundle = await bundleTypeScriptWithRolldown({
				file: entryFile,
				minify: props.minify,
				external: [
					'./awsless-env.mjs', // The env file is generated at deploy time.
					...(props.external ?? []),
					...handlers.flatMap(handler => handler.external ?? []),
				],
				importAsString: importAsString.length > 0 ? importAsString : undefined,
			})

			await temp.delete()

			// Clear out the stale chunks from the previous build.
			await rm(getBuildPath('function', props.name, 'files'), { recursive: true, force: true })

			await Promise.all([
				write('HASH', bundle.hash),
				...bundle.files.map(file => write(`files/${file.name}`, file.code)),
				...bundle.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
			])

			return {
				size: formatByteSize(bundle.files.reduce((total, file) => total + file.code.byteLength, 0)),
			}
		})
	}
}

export const createBundleLambda = (ctx: AppContext, props: FunctionDefaultProps) => {
	const group = new Group(ctx.base, 'function', 'bundle')

	// ------------------------------------------------------------
	// Collect the handlers & env vars from every feature.

	const handlers: BundleHandler[] = []
	const env: Record<string, Input<string>> = {}
	const envDeps = new Set<any>()
	const layers: Input<string>[] = []
	let timeout = toSeconds(props.timeout)
	const memorySize = toMebibytes(props.memorySize)

	const addHandler = (handler: BundleHandler) => {
		if (handlers.some(entry => entry.routeKey === handler.routeKey)) {
			throw new Error(`Duplicate bundle route: ${handler.routeKey}`)
		}

		handlers.push(handler)
	}

	const addEnv = (name: string, value: Input<string>) => {
		// All handlers share one bundle wide env, so we can't allow conflicting values.
		if (name in env && env[name] !== value) {
			throw new Error(
				`The env var "${name}" is defined multiple times with different values, while all bundled functions share the same env.`
			)
		}

		env[name] = value

		for (const dep of findInputDeps(value)) {
			envDeps.add(dep)
		}
	}

	const addLayer = (layer: Input<string>) => {
		layers.push(layer)
	}

	const setTimeout = (value: number) => {
		timeout = Math.max(timeout, value)
		lambdaProps.timeout = timeout
	}

	const name = formatGlobalResourceName({
		appName: ctx.app.name,
		resourceType: 'function',
		resourceName: 'bundle',
	})

	const shortName = formatGlobalResourceName({
		appName: ctx.app.name,
		resourceType: 'function',
		resourceName: shortId(`bundle:${ctx.appId}`),
	})

	// ------------------------------------------------------------
	// Build all handlers into a single code bundle.

	ctx.registerBuild(
		'function',
		name,
		buildBundle({
			name,
			handlers,
			minify: props.minify,
			external: props.external,
		})
	)

	// ------------------------------------------------------------
	// Resolve the env at deploy time & zip it into the bundle as an awsless-env.mjs file.

	const sourceHash = new Output<string>(envDeps, async (resolve: (value: string) => void) => {
		const buildHash = await readFile(getBuildPath('function', name, 'HASH'), 'utf8')
		const vars = await resolveInputs(env)
		const sorted = Object.fromEntries(Object.entries(vars).sort(([a], [b]) => a.localeCompare(b)))
		const envFile = `export default ${JSON.stringify(sorted, undefined, '\t')}
`

		const dir = getBuildPath('function', name, 'files')
		const files = await readdir(dir)
		const archive = await zipFiles([
			...files.filter(file => !file.endsWith('.map')).map(file => ({ name: file, path: join(dir, file) })),
			{ name: 'awsless-env.mjs', code: Buffer.from(envFile, 'utf8') },
		])

		await writeFile(getBuildPath('function', name, 'bundle.zip'), archive)

		resolve(createHash('sha1').update(buildHash).update(envFile).digest('hex'))
	})

	const code = new aws.s3.BucketObject(group, 'code', {
		bucket: ctx.shared.get('bundle', 'bucket-name'),
		key: `/lambda/${name}.zip`,
		source: relativePath(getBuildPath('function', name, 'bundle.zip')),
		sourceHash,
	})

	// ------------------------------------------------------------
	// The bundle role & permissions.

	const role = new aws.iam.Role(group, 'role', {
		name: shortName,
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

	const statements = new Set<Permission>()
	const statementDeps: Set<any> = new Set()

	const addPermission = (...permissions: Permission[]) => {
		for (const permission of permissions) {
			statements.add(permission)
			for (const dep of findInputDeps(permission)) {
				statementDeps.add(dep)
			}
		}
	}

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		policy: new Output(statementDeps, async (resolve: (value: string) => void) => {
			const list = await resolveInputs(Array.from(statements))

			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: list.map(statement => ({
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
	// The bundle lambda function.

	const logFormats = {
		text: 'Text',
		json: 'JSON',
	}

	const vpcPolicy = new aws.iam.RolePolicy(group, 'vpc-policy', {
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

	const lambdaProps: aws.lambda.FunctionInput = {
		functionName: name,
		description: `${ctx.app.name} bundle`,
		role: role.arn,
		runtime: props.runtime,
		handler: 'index.default',
		timeout,
		memorySize,
		architectures: [props.architecture],
		layers,

		// Publish a new immutable version on every deployment,
		// so that we can flip the alias & rollback deployments.
		publish: true,

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

		// The bundle doesn't have any env vars, because the env
		// is bundled inside the awsless-env.mjs file.
		environment: {
			variables: {},
		},

		// The bundle always lives inside the app vpc.
		vpcConfig: {
			securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
			subnetIds: ctx.shared.get('vpc', 'private-subnets'),
			ipv6AllowedForDualStack: true,
		},

		loggingConfig: {
			logGroup: `/aws/lambda/${name}`,
			logFormat: logFormats[props.log.format!],
			applicationLogLevel: props.log.format === 'json' ? props.log.level?.toUpperCase() : undefined,
			systemLogLevel: props.log.format === 'json' ? props.log.system?.toUpperCase() : undefined,
		},
	}

	const lambda = new aws.lambda.Function(group, 'function', lambdaProps, {
		dependsOn: [vpcPolicy],
	})

	const recursion = new aws.lambda.FunctionRecursionConfig(group, 'recursion', {
		functionName: lambda.functionName,
		recursiveLoop: 'Allow',
	})

	// ------------------------------------------------------------
	// Preserve the current live version while staging the new deployment.

	const onFailure = getGlobalOnFailure(ctx)
	const deployment = new BundleDeployment(
		group,
		'deployment',
		{
			deploymentId: ctx.deploymentId ?? 0,
			functionName: lambda.functionName,
			functionVersion: lambda.version,
			onFailureArn: onFailure,
		},
		{
			// Make sure the permissions are in place before any event source is wired up.
			dependsOn: [policy, recursion],
		}
	)

	// ------------------------------------------------------------
	// The alias is only retargeted by the post-deploy promotion step.

	const alias = new aws.lambda.Alias(
		group,
		'alias',
		{
			description: deployment.liveDescription,
			name: 'live',
			functionName: lambda.functionName,
			functionVersion: deployment.liveVersion,
		},
		{
			dependsOn: [policy, recursion],
		}
	)

	// ------------------------------------------------------------
	// Async invoked handlers share the retry & on-failure config of the alias.

	new aws.lambda.FunctionEventInvokeConfig(
		group,
		'async',
		{
			functionName: lambda.functionName,
			qualifier: alias.name,
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

	// ------------------------------------------------------------
	// Logging

	let logGroup: aws.cloudwatch.LogGroup | undefined

	if (props.log.retention!.value > 0n) {
		logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(props.log.retention),
		})

		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})
	}

	return {
		lambda,
		alias,
		logGroup,
		policy,
		sourceHash,
		addHandler,
		addEnv,
		addLayer,
		setTimeout,
		addPermission,
	}
}
