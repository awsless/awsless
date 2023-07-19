
import { CombinedDefaultPluginsConfigInput } from './plugins'

export { definePlugin, Plugin } from './plugin'

export type AppConfig = CombinedDefaultPluginsConfigInput
export type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number]
