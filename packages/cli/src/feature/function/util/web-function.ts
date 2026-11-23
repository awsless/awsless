import { toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, resolveInputs } from '@terraforge/core'
import { Permission, StackContext } from '../../../feature.js'
import { shortId } from '../../../util/id.js'
import { formatLocalResourceName } from '../../../util/name.js'
import { relativePath } from '../../../util/path.js'
import { formatPolicyDocument } from '../../../util/policy.js'
import { PolicyStatement } from '../../bundle/policy.js'
import { createWebFunction, getWebFunctionDefaults } from '../../bundle/util/web-function.js'
import { WebFunctionProps } from '../schema.js'
import { applySandbox, registerFunctionBuild } from './function.js'

// The file Lambda starts: the build's one entry, which serves from the moment it loads.
const ENTRY_FILE = 'index.mjs'

const ownFields = ['timeout', 'log', 'environment', 'permissions', 'sandbox'] as const

// A route or ssr with a config of its own runs as a web function of its own,
// like a stack function with one runs as a lambda of its own.
export const isStandaloneWebFunction = (props: WebFunctionProps) => {
	return ownFields.some(field => typeof props[field] !== 'undefined')
}

// Deploys a route's or a site's ssr handler as a web function of its own:
// its own code, role & env behind its own endpoint, which only its router's
// distribution may call. Promotion puts its revision live with the routes.
export const createStandaloneWebFunction = (
	ctx: StackContext,
	props: {
		// What the handler serves, for its names: a route, or a site.
		kind: 'route' | 'site'
		id: string
		routeKey: string
		router: string
		local: WebFunctionProps
	}
) => {
	const { kind, id, local } = props
	const defaults = getWebFunctionDefaults(ctx)
	const group = new Group(ctx.stack, 'web-function', `${kind}-${id}`)

	const name = formatLocalResourceName({
		appName: ctx.app.name,
		stackName: ctx.stack.name,
		resourceType: kind,
		resourceName: id,
	})

	// ------------------------------------------------------------
	// The code, with the app wide env baked into its archive.

	const build = registerFunctionBuild(ctx, name, {
		code: local.code,
		handler: local.handler,
		web: { routeKey: props.routeKey },
	})

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `web-function/${name}.zip`,
			source: relativePath(build.zipFile),
			sourceHash: build.sourceHash,
		},
		{
			replaceOnChanges: ['bucket', 'key'],
		}
	)

	// ------------------------------------------------------------
	// The role & permissions.

	// The readable name blows past the 64 character IAM limit for
	// ordinary ids, so the role name is a hash instead.
	const roleName = shortId(`${ctx.app.name}:${ctx.stack.name}:web-function:${kind}:${id}:${ctx.appId}`)

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
						Principal: { Service: ['lambda.amazonaws.com'] },
					},
				],
			}),
		},
		{
			import: ctx.import ? roleName : undefined,
		}
	)

	const statements: Permission[] = []
	const statementDeps = new Set<any>()

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
			resolve(formatPolicyDocument((await resolveInputs(statements)) as PolicyStatement[]))
		}),
	})

	const sandbox = local.sandbox !== undefined && local.sandbox !== false ? local.sandbox : undefined

	if (sandbox) {
		// A sandboxed handler only gets its own explicit permissions, without
		// the app wide grants, so it can't touch any other resource of the app.
		addPermission(...(local.permissions ?? []))
	} else {
		addPermission(...(ctx.appConfig.function.permissions ?? []), ...(local.permissions ?? []))
		ctx.onPermission(permission => addPermission(permission))
		ctx.shared.add('function', 'role', name, role)
	}

	// ------------------------------------------------------------
	// Env Vars

	// The basics in the function's own env, like every copy of the bundle has.
	const variables: Record<string, Input<string>> = {
		APP: ctx.appConfig.name,
		APP_ID: ctx.appId,
		AWS_ACCOUNT_ID: ctx.accountId,
		REGION: ctx.appConfig.region,
		STAGE: ctx.appConfig.stage ?? 'default',

		// A web function lives inside the vpc, so use the dualstack aws endpoints.
		AWS_USE_DUALSTACK_ENDPOINT: 'true',
	}

	// Everything else is baked into the code archive: a web function refuses
	// an empty env value (a sandbox without configs has one), and its env is
	// limited in size. What the handler sets itself wins over the app wide
	// env. A sandboxed handler receives that too: it only names resources,
	// while IAM keeps everything off its allowlist unreachable.
	const own = new Set<string>()

	const setEnvironment = (key: string, value: Input<string>) => {
		own.add(key)
		build.addEnv(key, value)
	}

	const addAppEnv = (key: string, value: Input<string>) => {
		if (!own.has(key)) {
			build.addEnv(key, value)
		}
	}

	for (const [key, value] of Object.entries({ ...ctx.appConfig.function.environment, ...local.environment })) {
		setEnvironment(key, value)
	}

	ctx.onEnv(addAppEnv)
	ctx.onBind(addAppEnv)

	if (sandbox) {
		applySandbox(ctx, `${kind}-${id}`, sandbox, { group, addPermission, setEnvironment })
	}

	// ------------------------------------------------------------

	return createWebFunction(ctx, group, {
		name,
		code,
		entryFile: ENTRY_FILE,
		role,
		variables,
		timeout: toSeconds(local.timeout ?? defaults.timeout),
		maxConcurrency: sandbox ? 1 : undefined,
		log: { ...defaults.log, ...definedOnly(local.log) },
		networkConnectorArn: ctx.shared.get('bundle', 'web-network-connector').latestVersionArn,
		routers: [props.router],
		// The bucket policy lets Lambda read the code.
		dependsOn: [policy, ctx.shared.get('asset', 'bucket').policy],
		addPermission,
	})
}

const definedOnly = <T extends object>(value: T | undefined) => {
	return Object.fromEntries(Object.entries(value ?? {}).filter(([, item]) => item !== undefined)) as Partial<T>
}
