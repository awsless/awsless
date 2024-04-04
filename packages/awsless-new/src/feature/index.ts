import { cronFeature } from './cron/index.js'
import { domainFeature } from './domain/index.js'
import { functionFeature } from './function/index.js'
import { onFailureFeature } from './on-failure/index.js'
import { pubsubFeature } from './pubsub/index.js'
import { queueFeature } from './queue/index.js'
import { storeFeature } from './store/index.js'
import { tableFeature } from './table/index.js'
import { testFeature } from './test/index.js'
import { topicFeature } from './topic/index.js'

export const features = [
	//
	onFailureFeature,
	functionFeature,
	pubsubFeature,
	tableFeature,
	topicFeature,
	queueFeature,
	storeFeature,
	testFeature,
	domainFeature,
	cronFeature,
]
