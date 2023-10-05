
import { AppConfigFactory } from './config.js'
import { CombinedDefaultPluginsConfigInput } from './plugins/index.js'

export { definePlugin, Plugin } from './plugin.js'

export type AppConfig = CombinedDefaultPluginsConfigInput
export type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number]

export const defineStackConfig = (config:StackConfig) => {
	return config
}

export const defineAppConfig = (config:AppConfig | AppConfigFactory<AppConfig>) => {
	return config
}

export { APP, STACK, getLocalResourceName, getGlobalResourceName } from './node/resource.js'
export { getFunctionName, FunctionResources, Function } from './node/function.js'
export { getTableName, TableResources, Table } from './node/table.js'
export { getTopicName, TopicResources, Topic } from './node/topic.js'
export { getQueueName, QueueResources, Queue } from './node/queue.js'
export { getCacheProps, CacheResources, Cache } from './node/cache.js'
export { getStoreName, StoreResources, Store } from './node/store.js'
export { getConfigName, ConfigResources, Config } from './node/config.js'
export { getSearchName, SearchResources, Search } from './node/search.js'
