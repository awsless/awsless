
import { defineAppConfig } from "../../src/index.js"
import { storeStack } from "./stack/store"
import { queueStack } from "./stack/queue"
import { tableStack } from "./stack/table"
import { functionStack } from './stack/function'
import { graphqlOneStack } from "./stack/graphql-one"
import { graphqlTwoStack } from "./stack/graphql-two"
import { topicStack } from "./stack/topic"
import { cronStack } from "./stack/cron"
import { pubsubStack } from "./stack/pubsub"
import { httpStack } from "./stack/http"
import { failureStack } from "./stack/failure.js"
import { cacheStack } from "./stack/cache.js"

export default defineAppConfig(input => ({
	name: 'app',
	// stage: input.stage || 'prod',
	region: 'eu-west-1',
	profile: input.profile || 'jacksclub',
	domains: {
		'getblockalert.com': [],
	},
	defaults: {
		graphql: {
			api: {
				domain: 'getblockalert.com',
				subDomain: 'graphql',
			},
		},
		http: {
			api: {
				domain: 'getblockalert.com',
				subDomain: 'api',
			}
		},
		function: {
			memorySize: '512 MB',
			// environment: {
			// 	BUGSNAG_API_KEY: 'test'
			// }
		},
	},
	stacks: [
		cacheStack,
		tableStack,
		queueStack,
		// storeStack,
		functionStack,
		// topicStack,
		// cronStack,
		// pubsubStack,
		failureStack,
		httpStack,
		// searchStack,

		graphqlOneStack,
		graphqlTwoStack,
	]
}))
