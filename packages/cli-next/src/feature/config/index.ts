import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { configParameterPrefix } from '../../util/ssm.js'
import { constantCase } from 'change-case'

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

		for (const name of ctx.appConfig.configs ?? []) {
			ctx.registerConfig(name)
			ctx.addEnv(`CONFIG_${constantCase(name)}`, name)
		}
	},
})
