import { cacheFeature } from './cache/index.js'
import { cronFeature } from './cron/index.js'
import { domainFeature } from './domain/index.js'
import { configFeature } from './config/index.js'
import { functionFeature } from './function/index.js'
import { graphqlFeature } from './graphql/index.js'
import { onFailureFeature } from './on-failure/index.js'
import { pubsubFeature } from './pubsub/index.js'
import { queueFeature } from './queue/index.js'
import { storeFeature } from './store/index.js'
import { tableFeature } from './table/index.js'
import { testFeature } from './test/index.js'
import { topicFeature } from './topic/index.js'
import { vpcFeature } from './vpc/index.js'
import { authFeature } from './auth/index.js'
import { httpFeature } from './http/index.js'
import { searchFeature } from './search/index.js'
import { siteFeature } from './site/index.js'

export const features = [
	// 1
	vpcFeature,
	authFeature,
	domainFeature,
	onFailureFeature,

	// 2
	functionFeature,
	graphqlFeature,
	configFeature,
	searchFeature,
	pubsubFeature,
	tableFeature,
	topicFeature,
	queueFeature,
	storeFeature,
	testFeature,
	cronFeature,
	cacheFeature,
	httpFeature,
	siteFeature,
]
