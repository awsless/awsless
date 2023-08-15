
import { AppConfigFactory } from './config.js'
import { CombinedDefaultPluginsConfigInput } from './plugins/index.js'

export { definePlugin, Plugin } from './plugin.js'

export type AppConfig = CombinedDefaultPluginsConfigInput
export type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number]

export const defineAppConfig = (config:AppConfig | AppConfigFactory<AppConfig>) => {
	return config
}

export { getResourceName, getFunctionName, getQueueName, getStoreName, getTableName } from './node/resource.js'
