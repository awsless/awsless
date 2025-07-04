import { authFeature } from './auth/index.js'
import { cacheFeature } from './cache/index.js'
import { commandFeature } from './command/index.js'
import { configFeature } from './config/index.js'
import { cronFeature } from './cron/index.js'
import { domainFeature } from './domain/index.js'
import { functionFeature } from './function/index.js'
// import { graphqlFeature } from './__graphql/index.js'
// import { httpFeature } from './__http/index.js'
// import { instanceFeature } from './__instance/index.js'
import { onLogFeature } from './on-log/index.js'
import { onFailureFeature } from './on-failure/index.js'
import { pubsubFeature } from './pubsub/index.js'
import { queueFeature } from './queue/index.js'
import { restFeature } from './rest/index.js'
import { rpcFeature } from './rpc/index.js'
import { searchFeature } from './search/index.js'
import { siteFeature } from './site/index.js'
import { storeFeature } from './store/index.js'
// import { streamFeature } from './__stream/index.js'
import { tableFeature } from './table/index.js'
import { taskFeature } from './task/index.js'
import { testFeature } from './test/index.js'
import { topicFeature } from './topic/index.js'
import { vpcFeature } from './vpc/index.js'
import { alertFeature } from './alert/index.js'
import { layerFeature } from './layer/index.js'
import { imageFeature } from './image/index.js'
import { iconFeature } from './icon/index.js'

export const features = [
	// 1
	vpcFeature,
	domainFeature,
	commandFeature,
	layerFeature,

	// 1.5
	onFailureFeature,
	onLogFeature,

	// 2
	authFeature,

	// 3
	functionFeature,
	// instanceFeature,
	// graphqlFeature,
	configFeature,
	searchFeature,
	pubsubFeature,
	// streamFeature,
	tableFeature,
	topicFeature,
	alertFeature,
	queueFeature,
	storeFeature,
	cacheFeature,
	taskFeature,
	testFeature,
	cronFeature,
	// httpFeature,
	restFeature,
	siteFeature,
	imageFeature,
	iconFeature,

	// 4
	rpcFeature,
]
