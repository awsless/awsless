import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { configParameterPrefix } from '../../util/ssm.js'

export const configFeature = defineFeature({
	name: 'config',

	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(0, false)

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
		// knows which SSM parameters to fetch at cold start.
		if (names.length > 0) {
			ctx.addEnv('CONFIGS', names.join(','))
		}
	},
})
