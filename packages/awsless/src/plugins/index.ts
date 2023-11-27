import { ExtendedConfigInput, ExtendedConfigOutput } from '../plugin.js'

import { cronPlugin } from './cron/index.js'
import { functionPlugin } from './function.js'
import { queuePlugin } from './queue.js'
import { tablePlugin } from './table.js'
import { storePlugin } from './store.js'
import { topicPlugin } from './topic.js'
import { extendPlugin } from './extend.js'
import { pubsubPlugin } from './pubsub.js'
import { graphqlPlugin } from './graphql.js'
import { domainPlugin } from './domain.js'
import { onFailurePlugin } from './on-failure/index.js'
import { vpcPlugin } from './vpc.js'
import { httpPlugin } from './http.js'
import { searchPlugin } from './search.js'
import { cachePlugin } from './cache.js'
import { restPlugin } from './rest.js'
import { configPlugin } from './config.js'
import { sitePlugin } from './site.js'
import { featurePlugin } from './feature.js'
import { authPlugin } from './auth.js'
import { testPlugin } from './test.js'
// import { alertPlugin } from './__alert.js'

export const defaultPlugins = [
	extendPlugin,
	featurePlugin,
	vpcPlugin,
	domainPlugin,
	functionPlugin,
	configPlugin,
	cachePlugin,
	cronPlugin,
	queuePlugin,
	tablePlugin,
	storePlugin,
	// alertPlugin,
	topicPlugin,
	pubsubPlugin,
	searchPlugin,
	authPlugin,
	graphqlPlugin,
	httpPlugin,
	restPlugin,
	sitePlugin,
	onFailurePlugin,
	testPlugin,
]

export type CombinedDefaultPluginsConfigOutput = ExtendedConfigOutput<(typeof defaultPlugins)[number]['schema']>
export type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<(typeof defaultPlugins)[number]['schema']>
