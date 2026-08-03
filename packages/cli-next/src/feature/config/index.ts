import { constantCase } from 'change-case'
import { join } from 'path'
import { createSsmServer } from '../../dev/servers/ssm.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { directories } from '../../util/path.js'
import { configParameterPrefix } from '../../util/ssm.js'

export const configFeature = defineFeature({
	name: 'config',

	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(0, false)

		// Camel case props, matching the runtime proxy & the mock api.
		for (const stack of ctx.stackConfigs) {
			for (const name of stack.configs ?? []) {
				resources.addType(name, 'string')
			}

			for (const site of Object.values(stack.sites ?? {})) {
				for (const name of site.build?.configs ?? []) {
					resources.addType(name, 'string')
				}
			}
		}

		gen.addInterface('ConfigResources', resources.toString())

		// The hoistable per test config overrides.
		const testConfigs = new TypeObject(2)

		for (const stack of ctx.stackConfigs) {
			for (const name of stack.configs ?? []) {
				testConfigs.addType(name, '(value: string) => void')
			}
		}

		const testMock = new TypeObject(1)
		testMock.addType('config', testConfigs)

		gen.addInterface('TestMock', testMock)

		await ctx.write('config.d.ts', gen, true)
	},
	onApp(ctx) {
		ctx.addAppPermission({
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
	},
	onStack(ctx) {
		// The app level wildcard grant above already covers every config
		// parameter, so the stacks don't need their own grants.
		const configs = ctx.stackConfig.configs ?? []

		for (const name of configs) {
			ctx.registerConfig(name)
			ctx.addEnv(`CONFIG_${constantCase(name)}`, name)
		}
	},
	async onDev(ctx) {
		const names = new Set<string>()

		for (const stack of ctx.stackConfigs) {
			for (const name of stack.configs ?? []) {
				names.add(name)
			}
		}

		if (names.size === 0) {
			return
		}

		for (const name of names) {
			ctx.addEnv(`CONFIG_${constantCase(name)}`, name)
			ctx.registerResource({ kind: 'config', id: name })
		}

		// Config values come from a local json file instead of ssm:
		// { "MY_CONFIG_NAME": "value" }
		const file = join(directories.output, 'local', 'config.json')
		const server = createSsmServer({ file })
		const port = await server.listen()

		ctx.addEnv('AWS_ENDPOINT_URL_SSM', `http://127.0.0.1:${port}`)

		// The worker reads config values once during module init.
		ctx.restartOnChange(file)

		ctx.registerServer({
			name: 'config',
			start({ log }) {
				server.connect(log)
			},
			stop() {
				return server.stop()
			},
		})
	},
})
