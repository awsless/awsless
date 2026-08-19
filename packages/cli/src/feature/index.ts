import { alertFeature } from './alert/index.js'
import { assetFeature } from './asset/index.js'
import { authFeature } from './auth/index.js'
import { bundleFeature } from './bundle/index.js'
import { cacheFeature } from './cache/index.js'
import { commandFeature } from './command/index.js'
import { configFeature } from './config/index.js'
import { cronFeature } from './cron/index.js'
import { domainFeature } from './domain/index.js'
import { emailFeature } from './email/index.js'
import { functionFeature } from './function/index.js'
import { iconFeature } from './icon/index.js'
import { imageFeature } from './image/index.js'
import { instanceFeature } from './instance/index.js'
import { jobFeature } from './job/index.js'
import { layerFeature } from './layer/index.js'
import { metricFeature } from './metric/index.js'
import { onErrorLogFeature } from './on-error-log/index.js'
import { onFailureFeature } from './on-failure/index.js'
import { pubsubFeature } from './pubsub/index.js'
import { queueFeature } from './queue/index.js'
import { restFeature } from './rest/index.js'
import { routerFeature } from './router/index.js'
import { rpcFeature } from './rpc/index.js'
import { searchFeature } from './search/index.js'
import { siteFeature } from './site/index.js'
import { storeFeature } from './store/index.js'
import { tableFeature } from './table/index.js'
import { taskFeature } from './task/index.js'
import { testFeature } from './test/index.js'
import { topicFeature } from './topic/index.js'
import { vpcFeature } from './vpc/index.js'

export const features = [
	// 1. The base infra that everything below builds on.
	vpcFeature,
	domainFeature,
	assetFeature,
	routerFeature,
	commandFeature,
	layerFeature,

	// 2. The global failure/error-log handlers. Both handlers exclude
	// themselves from their own failure wiring by sharing their keys
	// only after their handler lambda exists, so they must come before
	// every other lambda creating feature.
	onFailureFeature,
	onErrorLogFeature,

	// 3. The shared bundle lambda that hosts all feature handlers.
	bundleFeature,

	// 4. The remaining app features, building on everything above.
	authFeature,
	functionFeature,
	instanceFeature,
	jobFeature,
	configFeature,
	emailFeature,
	searchFeature,
	pubsubFeature,
	metricFeature,
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

	// 5. The rpc api serves routes from the features above.
	rpcFeature,
]
