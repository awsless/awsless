import { kebabCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { configParameterPrefix } from '../../util/ssm.js'
import { constantCase } from 'change-case'

export const configFeature = defineFeature({
	name: 'config',

	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(0, false)

		for (const stack of ctx.stackConfigs) {
			for (const name of stack.configs ?? []) {
				resources.addConst(name, 'string')
			}
		}

		gen.addInterface('ConfigResources', resources.toString())

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
		const configs = ctx.stackConfig.configs ?? []

		for (const name of configs) {
			ctx.registerConfig(name)
			ctx.addEnv(`CONFIG_${constantCase(name)}`, name)
		}

		if (configs.length) {
			// ctx.addEnv('CONFIG', configs.join(','))
			ctx.addStackPermission({
				actions: [
					'ssm:GetParameter',
					'ssm:GetParameters',
					'ssm:GetParametersByPath',
					'ssm:GetParameterHistory',
				],
				resources: configs.map(
					name =>
						`arn:aws:ssm:${ctx.appConfig.region}:${ctx.accountId}:parameter${configParameterPrefix(
							ctx.app.name
						)}/${kebabCase(name)}` as const
				),
			})
		}
	},
})
