
import { defineAppConfig } from "../../src/index"
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
import { failureStack } from "./stack/failure"
import { cacheStack } from "./stack/cache"
import { searchStack } from "./stack/search"
import { restStack } from "./stack/rest"

export default defineAppConfig(input => ({
	name: 'app',
	// stage: input.stage || 'prod',
	region: 'eu-west-1',
	profile: input.profile || 'jacksclub',
	// profile: 'op://personal/<item>/<field>',
	domains: {
		'getblockalert.com': [],
		// main: {
		// 	domain: input.stage === 'prod' ? 'getblockalert.com' :
		// }
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
		rest: {
			api: {
				domain: 'getblockalert.com',
				subDomain: 'rest',
			}
		},
		function: {
			memorySize: '512 MB',
			// environment: {
			// 	BUGSNAG_API_KEY: 'test'
			// }
		},
	},
	// events: {
	// 	bet: {
	// 		id: 'string',
	// 		name: 'string',
	// 		date: 'date',
	// 		options: 'array',
	// 	}
	// },
	stacks: [
		// cacheStack,
		// tableStack,
		queueStack,
		// storeStack,
		functionStack,
		topicStack,
		cronStack,
		// pubsubStack,
		failureStack,
		restStack,
		// httpStack,
		// searchStack,

		graphqlOneStack,
		graphqlTwoStack,
	]
}))
