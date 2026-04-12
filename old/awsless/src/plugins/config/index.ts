import { definePlugin } from '../../plugin.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { formatArn } from '../../formation/util.js'
import { configParameterPrefix } from '../../util/param.js'
import { paramCase } from 'change-case'

export const configPlugin = definePlugin({
	name: 'config',

	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(0, false)

		for (const stack of config.stacks) {
			for (const name of stack.configs || []) {
				resources.addConst(name, 'string')
			}
		}

		gen.addInterface('ConfigResources', resources.toString())

		await write('config.d.ts', gen, true)
	},
	onStack({ bind, config, stackConfig }) {
		const configs = stackConfig.configs
		bind(lambda => {
			if (configs && configs.length) {
				lambda.addEnvironment('CONFIG', configs.join(','))
				lambda.addPermissions({
					actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
					resources: configs.map(name => {
						return formatArn({
							service: 'ssm',
							resource: 'parameter',
							resourceName: configParameterPrefix(config) + '/' + paramCase(name),
							seperator: '',
						})
					}),
				})
			}
		})
	},
})
