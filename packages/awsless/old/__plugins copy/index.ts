
import { cronPlugin } from './cron/index.js';
import { functionPlugin } from './function/index.js';
import { queuePlugin } from './queue.js';
import { ExtendedConfigInput, ExtendedConfigOutput } from '../plugin.js';
import { tablePlugin } from './table/index.js';
import { storePlugin } from './store.js';
import { topicPlugin } from './topic.js';
import { searchPlugin } from './search.js';
import { graphqlPlugin } from './graphql/index.js';

export const defaultPlugins = [
	functionPlugin,
	cronPlugin,
	queuePlugin,
	tablePlugin,
	storePlugin,
	topicPlugin,
	searchPlugin,
	graphqlPlugin,
]

export type CombinedDefaultPluginsConfigOutput = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>
export type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>
