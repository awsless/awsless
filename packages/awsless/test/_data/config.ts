
import { defineAppConfig } from '../../src/index.js'
import { storeStack } from './stack/store.js'
import { queueStack } from './stack/queue.js'
import { tableStack } from './stack/table.js'
import { functionStack } from './stack/function.js'
import { graphqlOneStack } from './stack/graphql-one.js'
import { graphqlTwoStack } from './stack/graphql-two.js'
import { topicStack } from './stack/topic.js'
import { cronStack } from './stack/cron.js'
import { pubsubStack } from './stack/pubsub.js'
import { httpStack } from './stack/http.js'
import { failureStack } from './stack/failure.js'
import { cacheStack } from './stack/cache.js'
import { searchStack } from './stack/search.js'
import { restStack } from './stack/rest.js'
import { configStack } from './stack/config.js'
import { siteStack } from './stack/site.js'

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
		// graphql: {
		// 	api: {
		// 		domain: 'getblockalert.com',
		// 		subDomain: 'graphql',
		// 	},
		// },
		// http: {
		// 	api: {
		// 		domain: 'getblockalert.com',
		// 		subDomain: 'api',
		// 	}
		// },
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
		// queueStack,
		// storeStack,
		functionStack,
		configStack,
		// topicStack,
		// cronStack,
		// pubsubStack,
		// failureStack,
		restStack,
		siteStack,
		// httpStack,
		// searchStack,

		// graphqlOneStack,
		// graphqlTwoStack,
	]
}))
