
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

export { APP, STACK, getLocalResourceName, getGlobalResourceName, getSecretName } from './node/resource'
export { getFunctionName, FunctionResources, Function } from './node/function'
export { getTableName, TableResources, Table } from './node/table'
export { getTopicName, TopicResources, Topic } from './node/topic'
export { getQueueName, QueueResources, Queue } from './node/queue'
export { getCacheProps, CacheResources, Cache } from './node/cache'
export { getStoreName, StoreResources, Store } from './node/store'
export { getSearchName, SearchResources, Search } from './node/search'
