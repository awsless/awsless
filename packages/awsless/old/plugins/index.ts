
import { ExtendedConfigInput, ExtendedConfigOutput } from '../plugin.js';

import { cronPlugin } from './cron/index.js';
import { functionPlugin } from './function/index.js';
import { queuePlugin } from './queue.js';
import { tablePlugin } from './table/index.js';
import { storePlugin } from './store.js';
import { topicPlugin } from './topic.js';
// import { searchPlugin } from './__search.js';
import { graphqlPlugin } from './graphql/index.js';
import { pubsubPlugin } from './pubsub.js';
import { httpPlugin } from './http/index.js';
import { domainPlugin } from './domain/index.js';

export const defaultPlugins = [
	functionPlugin,
	cronPlugin,
	queuePlugin,
	tablePlugin,
	storePlugin,
	topicPlugin,
	// searchPlugin,
	graphqlPlugin,
	pubsubPlugin,
	domainPlugin,
	httpPlugin,
]

export type CombinedDefaultPluginsConfigOutput = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>
export type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>
