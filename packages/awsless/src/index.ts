import { AppConfigFactory } from './config.js'
import { CombinedDefaultPluginsConfigInput } from './plugins/index.js'

export { definePlugin, Plugin } from './plugin.js'

export type AppConfig = CombinedDefaultPluginsConfigInput
export type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number]

export const defineStackConfig = (config: StackConfig) => config
export const defineAppConfig = (config: AppConfig | AppConfigFactory<AppConfig>) => config

// Node
export { APP, STACK, getLocalResourceName, getGlobalResourceName } from './node/resource.js'
export { getFunctionName, FunctionResources, Function, Fn } from './node/function.js'
export { getAuthName, getAuthProps, AuthResources, Auth } from './node/auth.js'
export { getTableName, TableResources, Table } from './node/table.js'
export { getTopicName, TopicResources, Topic } from './node/topic.js'
export { getQueueName, QueueResources, Queue } from './node/queue.js'
export { getCacheProps, CacheResources, Cache } from './node/cache.js'
export { getStoreName, StoreResources, Store } from './node/store.js'
export { getConfigName, ConfigResources, Config } from './node/config.js'
export { getSearchName, SearchResources, Search } from './node/search.js'

// Handlers
export { func, FunctionProps } from './node/handle/function.js'
export { topic, TopicProps } from './node/handle/topic.js'
export { queue, QueueProps } from './node/handle/queue.js'
export { cron, CronProps } from './node/handle/cron.js'
