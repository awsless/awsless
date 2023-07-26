
import { CombinedDefaultPluginsConfigInput } from './plugins/index.js'

export { definePlugin, Plugin } from './plugin.js'

export type AppConfig = CombinedDefaultPluginsConfigInput
export type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number]

export { getResourceName, getResourceProxy, Table, Queue, Store } from './node/resource.js'
