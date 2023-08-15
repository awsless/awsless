
import { ExtendedConfigInput, ExtendedConfigOutput } from '../plugin.js';

import { cronPlugin } from './cron/index.js';
import { functionPlugin } from './function.js';
import { queuePlugin } from './queue.js';
import { tablePlugin } from './table.js';
import { storePlugin } from './store.js';
import { topicPlugin } from './topic.js';
import { extendPlugin } from './extend.js';
import { pubsubPlugin } from './pubsub.js';
import { graphqlPlugin } from './graphql.js';
import { domainPlugin } from './domain.js';

// import { searchPlugin } from './__search.js';
// import { httpPlugin } from './http/index.js';

export const defaultPlugins = [
	extendPlugin,
	functionPlugin,
	cronPlugin,
	queuePlugin,
	tablePlugin,
	storePlugin,
	topicPlugin,
	pubsubPlugin,
	// searchPlugin,
	domainPlugin,
	graphqlPlugin,
	// httpPlugin,
]

export type CombinedDefaultPluginsConfigOutput = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>
export type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>
