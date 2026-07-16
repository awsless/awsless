import { camelCase, kebabCase } from 'change-case'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteEnvName } from 'awsless'
import { formatRouteKey, internalHandler, parseExportName } from '../bundle/util.js'
import { directories } from '../../util/path.js'
import { relative } from 'path'
import { toSeconds } from '@awsless/duration'

export const rpcFeature = defineFeature({
	name: 'rpc',
	async onTypeGen(ctx) {
		const types = new TypeFile('awsless/client')

		types.addCode(`type Func = (...args: any[]) => any`)
		types.addCode(
			`type Handle<T extends Func, I = Parameters<T>[0], O = Promise<ReturnType<T>>> = undefined extends I ? (input?: I) => O : (input: I) => O`
		)

		const schemas = new TypeObject(1)

		for (const id of Object.keys(ctx.appConfig.defaults.rpc ?? {})) {
			const schema = new TypeObject(2)

			for (const stack of ctx.stackConfigs) {
				for (const [name, props] of Object.entries(stack.rpc?.[id] ?? {})) {
					const relFile = relative(directories.types, props.function.code.file)
					const varName = camelCase(`${id}-${stack.name}-${name}`)

					types.addImport(varName, relFile)
					schema.addType(name, `Handle<typeof ${varName}>`)
				}
			}

			schemas.addType(id, schema)
		}

		types.addInterface('RpcSchema', schemas)

		await ctx.write('rpc.d.ts', types, true)
	},
	onValidate(ctx) {
		const names: Record<string, Set<string>> = {}

		for (const id of Object.keys(ctx.appConfig.defaults.rpc ?? {})) {
			names[id] = new Set()
		}

		for (const stack of ctx.stackConfigs) {
			for (const [id, queries] of Object.entries(stack.rpc ?? {})) {
				const list = names[id]

				if (!list) {
					throw new FileError(stack.file, `The RPC API for "${id}" isn't defined on app level.`)
				}

				for (const name of Object.keys(queries ?? {})) {
					if (list.has(name)) {
						throw new FileError(stack.file, `Duplicate RPC API function "${id}.${name}"`)
					} else {
						list.add(name)
					}
				}
			}
		}
	},
	onApp(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, props] of Object.entries(ctx.appConfig.defaults.rpc ?? {})) {
			const group = new Group(ctx.base, 'rpc', id)

			// ------------------------------------------------------
			// Add the RPC server to the bundle

			const serverRouteKey = formatRouteKey(ctx.app.name, 'rpc', id)

			bundle.addHandler({
				routeKey: serverRouteKey,
				file: internalHandler('rpc'),
				exportName: 'default',
			})

			bundle.setTimeout(toSeconds(props.timeout))
			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'TIMEOUT'), toSeconds(props.timeout).toString())

			// ------------------------------------------------------
			// Create the lock table

			const lockTable = new aws.dynamodb.Table(group, 'lock', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'rpc-lock',
					resourceName: id,
				}),
				hashKey: 'key',
				billingMode: 'PAY_PER_REQUEST',
				ttl: {
					enabled: true,
					attributeName: 'ttl',
				},
				attribute: [
					{
						name: 'key',
						type: 'S',
					},
				],
			})

			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'LOCK_TABLE'), lockTable.name)

			bundle.addPermission({
				effect: 'allow',
				actions: ['dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
				resources: [lockTable.arn],
			})

			// ------------------------------------------------------
			// Add the auth handler to the bundle

			if (props.auth) {
				const authRouteKey = formatRouteKey(ctx.app.name, 'rpc', `${id}-auth`)

				bundle.addHandler({
					routeKey: authRouteKey,
					file: props.auth.code.file,
					exportName: parseExportName(props.auth.handler ?? ctx.appConfig.defaults.function.handler!),
					external: props.auth.code.external,
					importAsString: props.auth.code.importAsString,
				})

				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'AUTH'), authRouteKey)

				for (const [name, value] of Object.entries(props.auth.environment ?? {})) {
					bundle.addEnv(name, value)
				}

				for (const permission of props.auth.permissions ?? []) {
					bundle.addPermission(permission)
				}
			}

			// ------------------------------------------------------

			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)

			addRoutes({
				[props.path]: {
					type: 'lambda',
					requestHeaders: {
						'x-awsless-route': serverRouteKey,
					},
				},
			})
		}
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, queries] of Object.entries(ctx.stackConfig.rpc ?? {})) {
			const defaultProps = ctx.appConfig.defaults.rpc?.[id]

			if (!defaultProps) {
				throw new FileError(ctx.stackConfig.file, `RPC definition is not defined on app level for "${id}"`)
			}

			const serverRouteKey = formatRouteKey(ctx.app.name, 'rpc', id)

			for (const [name, props] of Object.entries(queries ?? {})) {
				const entryId = kebabCase(`${id}-${shortId(name)}`)
				const routeKey = formatRouteKey(ctx.stack.name, 'rpc', entryId)

				bundle.addHandler({
					routeKey,
					file: props.function.code.file,
					exportName: parseExportName(props.function.handler ?? ctx.appConfig.defaults.function.handler!),
					external: props.function.code.external,
					importAsString: props.function.code.importAsString,
				})

				for (const [envName, value] of Object.entries(props.function.environment ?? {})) {
					bundle.addEnv(envName, value)
				}

				for (const permission of props.function.permissions ?? []) {
					bundle.addPermission(permission)
				}

				// Whitelist the query so the rpc server can only
				// dispatch handlers that are registered here.
				bundle.addEnv(
					formatRouteEnvName(serverRouteKey, `QUERY:${name}`),
					JSON.stringify({ function: routeKey, lock: props.lock })
				)
			}
		}
	},
})
