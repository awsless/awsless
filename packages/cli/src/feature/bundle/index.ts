import { createHash } from 'crypto'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { toSeconds } from '@awsless/duration'
import { toMebibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, resolveInputs } from '@terraforge/core'
import { getBuildPath } from '../../build/index.js'
import { ExpectedError } from '../../error.js'
import { defineFeature, Permission } from '../../feature.js'
import { DeploymentAlias, LiveTarget } from '../../formation/lambda.js'
import { shortId } from '../../util/id.js'
import { LIVE_LAMBDA_ALIAS } from '../../util/lambda.js'
import { formatGlobalResourceName, getBundleFunctionName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { formatPolicyDocument } from '../../util/policy.js'
import { deployFunctionSourcemaps, formatLoggingConfig } from '../function/util.js'
import { createLogGroup } from '../on-error-log/util.js'
import { getGlobalOnFailure } from '../on-failure/util.js'
import { zipFiles } from './build/zip.js'
import { PolicyStatement } from './policy.js'
import { buildBundle, BundleHandler } from './util.js'

export const bundleFeature = defineFeature({
	name: 'bundle',
	onApp(ctx) {
		// ------------------------------------------------------
		// Create the app bundle lambda that contains all handlers.

		const defaults = ctx.appConfig.function
		const group = new Group(ctx.base, 'function', 'bundle')

		// ------------------------------------------------------
		// Collect the handlers & env vars from every feature.

		const handlers: BundleHandler[] = []
		const env: Record<string, Input<string>> = {}
		const envDeps = new Set<any>()
		const layers: Input<string>[] = []
		const timeout = toSeconds(defaults.timeout)
		const memorySize = toMebibytes(defaults.memorySize)

		const addHandler = (handler: BundleHandler) => {
			if (handlers.some(entry => entry.routeKey === handler.routeKey)) {
				throw new ExpectedError(`Duplicate bundle route: ${handler.routeKey}`)
			}

			handlers.push(handler)
		}

		const addEnv = (name: string, value: Input<string>) => {
			// All handlers share one bundle wide env, so we can't allow conflicting values.
			if (name in env && env[name] !== value) {
				throw new ExpectedError(
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
				// The local dev bundle skips minification - it only costs
				// reload time & garbles stack traces.
				minify: ctx.dev ? false : defaults.minify,
				external: [...(defaults.external ?? []), ...layerPackages],
			})
		)

		// ------------------------------------------------------
		// Resolve the env at deploy time & zip it into the bundle as an awsless-env.mjs file.

		const sourceHash = new Output<string>(envDeps, async (resolve: (value: string) => void) => {
			const buildHash = await readFile(getBuildPath('bundle', name, 'HASH'), 'utf8')
			const vars = await resolveInputs(env)
			const sorted = Object.fromEntries(Object.entries(vars).toSorted(([a], [b]) => a.localeCompare(b)))
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

		const role = new aws.iam.Role(
			group,
			'role',
			{
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
			},
			{
				import: ctx.import ? shortName : undefined,
			}
		)

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

				resolve(formatPolicyDocument(list))
			}),
		})

		// ------------------------------------------------------
		// The bundle lambda function.

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
			reservedConcurrentExecutions: defaults.reserved,
			ephemeralStorage: {
				size: toMebibytes(defaults.ephemeralStorageSize),
			},
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
			s3Key: code.key,

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

			loggingConfig: formatLoggingConfig(name, defaults.log),
		}

		const lambda = new aws.lambda.Function(group, 'function', lambdaProps, {
			dependsOn: [vpcPolicy],
			import: ctx.import ? name : undefined,
		})

		deployFunctionSourcemaps(group, ctx, {
			name,
			buildType: 'bundle',
			version: lambda.version,
		})

		// ------------------------------------------------------
		// Tag the published version with the deployment id alias &
		// preserve the current live version while staging.

		const onFailure = getGlobalOnFailure(ctx)
		const deployment = new DeploymentAlias(
			group,
			'deployment-alias',
			{
				functionName: lambda.functionName,
				functionVersion: lambda.version,
				id: ctx.deploymentId ?? 'local-0',
				onFailureArn: onFailure,
			},
			{
				// Make sure the permissions are in place before any event source is wired up.
				dependsOn: [policy],
			}
		)

		const liveTarget = new LiveTarget(group, 'live-target', {
			functionName: lambda.functionName,
			functionVersion: lambda.version,
		})

		// ------------------------------------------------------
		// The alias is only retargeted by the post-deploy promotion step.

		const alias = new aws.lambda.Alias(
			group,
			'alias',
			{
				description: liveTarget.liveDescription,
				name: LIVE_LAMBDA_ALIAS,
				functionName: lambda.functionName,
				functionVersion: liveTarget.liveVersion,
			},
			{
				dependsOn: [policy],
			}
		)

		// ------------------------------------------------------
		// Async invoked handlers share the retry & on-failure config of the alias.

		if (onFailure) {
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
		}

		// ------------------------------------------------------
		// Logging

		const logGroup = createLogGroup(group, ctx, {
			name: `/aws/lambda/${name}`,
			retention: defaults.log.retention,
		})

		if (logGroup) {
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

		ctx.shared.add('function', 'role', 'bundle', role)
		ctx.shared.set('bundle', 'main', {
			lambda,
			alias,
			deployment,
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
