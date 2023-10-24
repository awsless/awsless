
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { TypeGen } from '../util/type-gen.js';
import { formatArn } from '../formation/util.js';
import { configParameterPrefix } from '../util/param.js';
import { paramCase } from 'change-case';

const ConfigNameSchema = z.string().regex(/[a-z0-9\-]/g, 'Invalid config name')

export const configPlugin = definePlugin({
	name: 'config',
	schema: z.object({
		stacks: z.object({
			/** Define the config values for your stack.
			 * @example
			 * ```
			 * {
			 *   configs: [ 'your-secret' ]
			 * }
			 * ```
			 *
			 * You can access the config values via:
			 * @example
			 * ```
			 * import { Config } from '@awsless/awsless'
			 *
			 * Config.YOUR_SECRET
			 * ```
			 */
			configs: z.array(ConfigNameSchema).optional(),
		}).array()
	}),
	onTypeGen({ config }) {
		const types = new TypeGen('@awsless/awsless', 'ConfigResources', false)
		for(const stack of config.stacks) {
			for(const name of stack.configs || []) {
				types.addConst(name, 'string')
			}
		}

		return types.toString()
	},
	onStack({ bind, config, stackConfig }) {
		const configs = stackConfig.configs
		bind(lambda => {
			if(configs && configs.length) {
				lambda.addEnvironment('CONFIG', configs.join(','))
				lambda.addPermissions({
					actions: [
						'ssm:GetParameter',
						'ssm:GetParameters',
						'ssm:GetParametersByPath',
					],
					resources: configs.map(name => {
						// return '*'
						return formatArn({
							service: 'ssm',
							resource: 'parameter',
							resourceName: configParameterPrefix(config) + '/' + paramCase(name),
							seperator: '',
						})
					})
				})
			}
		})
	},
})
