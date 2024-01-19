import { authPlugin } from './auth/index.js'
import { cachePlugin } from './cache/index.js'
import { configPlugin } from './config/index.js'
import { cronPlugin } from './cron/index.js'
import { domainPlugin } from './domain/index.js'
import { featurePlugin } from './feature/index.js'
import { functionPlugin } from './function/index.js'
import { graphqlPlugin } from './graphql/index.js'
import { httpPlugin } from './http/index.js'
import { onFailurePlugin } from './on-failure/index.js'
import { pubsubPlugin } from './pubsub/pubsub.js'
import { queuePlugin } from './queue/queue.js'
import { restPlugin } from './rest/rest.js'
import { searchPlugin } from './search/search.js'
import { sitePlugin } from './site/index.js'
import { storePlugin } from './store/store.js'
import { tablePlugin } from './table/table.js'
import { testPlugin } from './test/index.js'
import { topicPlugin } from './topic/index.js'
import { vpcPlugin } from './vpc/index.js'

export const plugins = [
	authPlugin,
	cachePlugin,
	configPlugin,
	cronPlugin,
	domainPlugin,
	featurePlugin,
	functionPlugin,
	graphqlPlugin,
	httpPlugin,
	onFailurePlugin,
	pubsubPlugin,
	queuePlugin,
	restPlugin,
	searchPlugin,
	sitePlugin,
	storePlugin,
	tablePlugin,
	testPlugin,
	topicPlugin,
	vpcPlugin,
]
