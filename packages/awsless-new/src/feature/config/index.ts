import { paramCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeObject } from '../../type-gen/object.js'
import { TypeFile } from '../../type-gen/file.js'

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
	onStack(ctx) {
		const configs = ctx.stackConfig.configs
		ctx.onFunction(({ lambda }) => {
			if (configs && configs.length) {
				lambda.addEnvironment('CONFIG', configs.join(','))
				// lambda.permissions.
				// lambda.addPermissions({
				// 	actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
				// 	resources: configs.map(name => {
				// 		return formatArn({
				// 			service: 'ssm',
				// 			resource: 'parameter',
				// 			resourceName: configParameterPrefix(config) + '/' + paramCase(name),
				// 			seperator: '',
				// 		})
				// 	}),
				// })
			}
		})
	},
})
