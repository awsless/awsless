import { toDays, toSeconds } from '@awsless/duration'
import { toMebibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, resolveInputs } from '@terraforge/core'
import { pascalCase } from 'change-case'
import { createHash } from 'crypto'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getBuildPath } from '../../build/index.js'
import { defineFeature, Permission } from '../../feature.js'
import { BundleDeployment } from '../../formation/lambda.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName, getBundleFunctionName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { zipFiles } from './build/zip.js'
import { compactPolicyStatements, PolicyStatement } from './policy.js'
import { buildBundle } from './util.js'

export const bundleFeature = defineFeature({
	name: 'bundle',
	onApp(ctx) {
		// ------------------------------------------------------
		// Create the app bundle lambda that contains all handlers.

		const defaults = ctx.appConfig.function
		const group = new Group(ctx.base, 'function', 'bundle')

		// ------------------------------------------------------
		// Collect the handlers & env vars from every feature.

		const handlers: {
			routeKey: string
			file: string // The file path of the handler code.
			exportName: string // The name of the exported method within the handler code.
			external?: string[]
			importAsString?: string[]
			moduleSideEffects?: string[]
		}[] = []
		const env: Record<string, Input<string>> = {}
		const envDeps = new Set<any>()
		const layers: Input<string>[] = []
		const timeout = toSeconds(defaults.timeout)
		const memorySize = toMebibytes(defaults.memorySize)

		const addHandler = (handler: (typeof handlers)[number]) => {
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

		// ------------------------------------------------------
		// Attach the configured layers & keep their packages out
		// of the bundle, so imports resolve from the layer.

		const layerIds = Object.keys(ctx.appConfig.layers ?? {})
		const layerPackages = layerIds.flatMap(id => ctx.shared.entry('layer', 'packages', id))

		for (const id of layerIds) {
			addLayer(ctx.shared.entry('layer', 'arn', id))
		}

		const name = getBundleFunctionName(ctx.app.name)

		const shortName = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'function',
			resourceName: shortId(`bundle:${ctx.appId}`),
		})

		// ------------------------------------------------------
		// Build all handlers into a single code bundle.

		ctx.registerBuild(
			'bundle',
			name,
			buildBundle({
				name,
				handlers,
				minify: defaults.minify,
				external: [...(defaults.external ?? []), ...layerPackages],
			})
		)

		// ------------------------------------------------------
		// Resolve the env at deploy time & zip it into the bundle as an awsless-env.mjs file.

		const sourceHash = new Output<string>(envDeps, async (resolve: (value: string) => void) => {
			const buildHash = await readFile(getBuildPath('bundle', name, 'HASH'), 'utf8')
			const vars = await resolveInputs(env)
			const sorted = Object.fromEntries(Object.entries(vars).sort(([a], [b]) => a.localeCompare(b)))
			const envFile = `export default ${JSON.stringify(sorted, undefined, '\t')}
`

			const dir = getBuildPath('bundle', name, 'files')
			const files = await readdir(dir)
			const archive = await zipFiles([
				...files.filter(file => !file.endsWith('.map')).map(file => ({ name: file, path: join(dir, file) })),
				{ name: 'awsless-env.mjs', code: Buffer.from(envFile, 'utf8') },
			])

			await writeFile(getBuildPath('bundle', name, 'bundle.zip'), archive)

			resolve(createHash('sha1').update(buildHash).update(envFile).digest('hex'))
		})

		const code = new aws.s3.BucketObject(
			group,
			'code',
			{
				bucket: ctx.shared.get('asset', 'bucket').name,
				key: `bundle/${name}.zip`,
				source: relativePath(getBuildPath('bundle', name, 'bundle.zip')),
				sourceHash,
			},
			{
				replaceOnChanges: ['bucket', 'key'],
			}
		)

		// ------------------------------------------------------
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
				const list = (await resolveInputs(Array.from(statements))) as PolicyStatement[]

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

		// ------------------------------------------------------
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
			runtime: defaults.runtime,
			handler: 'index.default',
			timeout,
			memorySize,
			architectures: [defaults.architecture],
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

			// Only the basics live on the lambda itself, the rest is
			// delivered through the awsless-env.mjs file inside the code
			// bundle, because the lambda env size is limited.
			environment: {
				variables: {
					APP: ctx.appConfig.name,
					APP_ID: ctx.appId,
					AWS_ACCOUNT_ID: ctx.accountId,
					REGION: ctx.appConfig.region,
					STAGE: ctx.appConfig.stage ?? 'default',
					STANDALONE: 'false',

					// The bundle always lives inside a vpc, so use the
					// dualstack aws endpoints.
					AWS_USE_DUALSTACK_ENDPOINT: 'true',
				},
			},

			// The bundle always lives inside the app vpc.
			vpcConfig: {
				securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
				subnetIds: ctx.shared.get('vpc', 'private-subnets'),
				ipv6AllowedForDualStack: true,
			},

			loggingConfig: {
				logGroup: `/aws/lambda/${name}`,
				logFormat: logFormats[defaults.log.format!],
				applicationLogLevel: defaults.log.format === 'json' ? defaults.log.level?.toUpperCase() : undefined,
				systemLogLevel: defaults.log.format === 'json' ? defaults.log.system?.toUpperCase() : undefined,
			},
		}

		const lambda = new aws.lambda.Function(group, 'function', lambdaProps, {
			dependsOn: [vpcPolicy],
		})

		// ------------------------------------------------------
		// Preserve the current live version while staging the new deployment.

		const onFailure = getGlobalOnFailure(ctx)
		const deployment = new BundleDeployment(
			group,
			'deployment',
			{
				deploymentId: ctx.deploymentId ?? 'local-0',
				functionName: lambda.functionName,
				functionVersion: lambda.version,
				onFailureArn: onFailure,
				sourceAccount: ctx.accountId,
			},
			{
				// Make sure the permissions are in place before any event source is wired up.
				dependsOn: [policy],
			}
		)

		// ------------------------------------------------------
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
				dependsOn: [policy],
			}
		)

		// ------------------------------------------------------
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

		// ------------------------------------------------------
		// Logging

		let logGroup: aws.cloudwatch.LogGroup | undefined

		if (defaults.log.retention!.value > 0n) {
			logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
				name: `/aws/lambda/${name}`,
				retentionInDays: toDays(defaults.log.retention),
			})

			addPermission({
				actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
				resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
			})
		}

		// ------------------------------------------------------
		// The app level env vars & permissions apply to every handler.

		for (const [name, value] of Object.entries(defaults.environment ?? {})) {
			addEnv(name, value)
		}

		for (const permission of defaults.permissions ?? []) {
			addPermission(permission)
		}

		ctx.onEnv(addEnv)
		ctx.onBind(addEnv)

		// Every feature defines the permissions for its own resources.
		ctx.onPermission(addPermission)

		ctx.shared.set('bundle', 'main', {
			lambda,
			alias,
			logGroup,
			policy,
			addHandler,
			addEnv,
			addLayer,
			addPermission,
			statements,
		})
	},
})
