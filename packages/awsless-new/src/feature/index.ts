import { configFeature } from './config/index.js'
import { functionFeature } from './function/index.js'
import { onFailureFeature } from './on-failure/index.js'
import { pubsubFeature } from './pubsub/index.js'
import { queueFeature } from './queue/index.js'
import { storeFeature } from './store/index.js'
import { tableFeature } from './table/index.js'
import { testFeature } from './test/index.js'
import { topicFeature } from './topic/index.js'
import { vpcFeature } from './vpc/index.js'

export const features = [
	//
	vpcFeature,
	onFailureFeature,
	functionFeature,
	configFeature,
	pubsubFeature,
	tableFeature,
	topicFeature,
	queueFeature,
	storeFeature,
	testFeature,
]
