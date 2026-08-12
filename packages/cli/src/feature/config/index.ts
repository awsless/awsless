import { join } from 'path'
import { debug } from '../../cli/debug.js'
import { createSsmServer } from '../../dev/servers/ssm.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { getCredentials } from '../../util/aws.js'
import { directories } from '../../util/path.js'
import { configParameterPrefix, SsmStore } from '../../util/ssm.js'

export const configFeature = defineFeature({
	name: 'config',

	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(0, false)

		// Constant case props (MAX_BET), the runtime proxy kebab-cases
		// any casing to the real config name.
		for (const name of ctx.appConfig.configs ?? []) {
			resources.addConst(name, 'string')
		}

		for (const stack of ctx.stackConfigs) {
			for (const site of Object.values(stack.sites ?? {})) {
				for (const name of site.build?.configs ?? []) {
					resources.addConst(name, 'string')
				}
			}
		}

		gen.addInterface('ConfigResources', resources.toString())

		// The per test config overrides, assigned like plain props:
		// mock.config.MAX_BET = '1'. Reads give back the current value.
		const testConfigs = new TypeObject(2, false)

		for (const name of ctx.appConfig.configs ?? []) {
			testConfigs.addConst(name, 'string')
		}

		const testMock = new TypeObject(1)
		testMock.addType('config', testConfigs)

		gen.addInterface('TestMock', testMock)

		await ctx.write('config.d.ts', gen, true)
	},
	onApp(ctx) {
		// The wildcard grant covers every config parameter, so the
		// individual configs don't need their own grants.
		ctx.addPermission({
			actions: [
				//
				'ssm:GetParameter',
				'ssm:GetParameters',
				'ssm:GetParametersByPath',
				'ssm:GetParameterHistory',
			],
			resources: [
				`arn:aws:ssm:${ctx.appConfig.region}:${ctx.accountId}:parameter${configParameterPrefix(
					ctx.app.name
				)}/*`,
			],
		})

		const names = ctx.appConfig.configs ?? []

		for (const name of names) {
			ctx.registerConfig(name)
		}

		// A single env var announces every config name, so the runtime
		// knows which SSM parameters to fetch at cold start. The dev
		// environment announces its own union, including the sandbox &
		// site build configs.
		if (names.length > 0 && !ctx.dev) {
			ctx.addEnv('CONFIGS', names.join(','))
		}
	},
	async onDev(ctx) {
		const names = new Set<string>(ctx.appConfig.configs ?? [])

		// Sandboxed functions & site builds declare their own config
		// access, which all resolves through the same local values.
		for (const stack of ctx.stackConfigs) {
			for (const props of Object.values(stack.functions ?? {})) {
				if (typeof props.sandbox === 'object') {
					for (const name of props.sandbox.configs ?? []) {
						names.add(name)
					}
				}
			}

			for (const site of Object.values(stack.sites ?? {})) {
				for (const name of site.build?.configs ?? []) {
					names.add(name)
				}

				if (typeof site.ssr?.sandbox === 'object') {
					for (const name of site.ssr.sandbox.configs ?? []) {
						names.add(name)
					}
				}
			}
		}

		if (names.size === 0) {
			return
		}

		// The runtime fetches every announced config at cold start, all
		// resolving through the local ssm shim.
		ctx.addEnv('CONFIGS', [...names].join(','))

		for (const name of names) {
			ctx.registerResource({ kind: 'config', id: name })
		}

		// Local overrides come from a local json file, set through the
		// dashboard: { "my-config-name": "value" }
		const file = join(directories.output, 'local', 'config.json')
		// The shim survives restarts, so long lived children (like the
		// vite dev server) keep a valid endpoint.
		const { server, port } = await ctx.keep('shim:ssm', file, async () => {
			const server = createSsmServer({ file })
			const port = await server.listen()

			return { value: { server, port }, stop: () => server.stop() }
		})

		ctx.addEnv('AWS_ENDPOINT_URL_SSM', `http://127.0.0.1:${port}`)

		// The config values pull from the app's real ssm into memory,
		// once per dev session - they never touch disk & revoking the
		// developer's aws access revokes them everywhere. A failed pull
		// only warns: the env boots & the values can still be set on
		// the dashboard. A local override always wins over a pulled
		// value.
		const pulled = await ctx.keep('config:pull', [...names].sort().join(','), async () => {
			const values: Record<string, string> = {}

			try {
				ctx.log(`Pulling ${names.size} config value${names.size === 1 ? '' : 's'} from SSM...`)

				const credentials = await getCredentials(ctx.appConfig.profile)
				const store = new SsmStore({ credentials, appConfig: ctx.appConfig })
				let timer: ReturnType<typeof setTimeout> | undefined
				const all = await Promise.race([
					store.list(),
					new Promise<never>((_, reject) => {
						timer = setTimeout(() => reject(new Error('the pull timed out after 15s')), 15_000)
					}),
				]).finally(() => clearTimeout(timer))

				for (const name of names) {
					if (typeof all[name] === 'string') {
						values[name] = all[name]
					}
				}
			} catch (error) {
				debug('Config pull failed', error)
				ctx.log(
					`Couldn't pull the config values from SSM (${
						error instanceof Error ? error.message : String(error)
					}) - set them on the dashboard instead.`
				)
			}

			return { value: values, stop: () => {} }
		})

		server.setValues({ pulled })

		// The worker reads config values once during module init.
		ctx.restartOnChange(file)

		ctx.registerServer({
			name: 'config',
			start({ log }) {
				server.connect(log)
			},
		})
	},
})
