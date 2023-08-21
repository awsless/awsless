
import { AppConfigFactory } from './config'
import { CombinedDefaultPluginsConfigInput } from './plugins/index'

export { definePlugin, Plugin } from './plugin'

export type AppConfig = CombinedDefaultPluginsConfigInput
export type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number]

export const defineStackConfig = (config:StackConfig) => {
	return config
}

export const defineAppConfig = (config:AppConfig | AppConfigFactory<AppConfig>) => {
	return config
}

export {
	getLocalResourceName,
	getGlobalResourceName,
	getFunctionName,
	getQueueName,
	getStoreName,
	getTableName,
	getTopicName
} from './node/resource'
