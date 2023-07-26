
import { AppConfig } from "../../src"
import { storeStack } from "./stack/store"
import { queueStack } from "./stack/queue"
import { tableStack } from "./stack/table"
import { functionStack } from './stack/function'
import { graphqlOneStack } from "./stack/graphql-one"
import { graphqlTwoStack } from "./stack/graphql-two"
import { topicStack } from "./stack/topic"
import { cronStack } from "./stack/cron"

export default {
	name: 'app',
	profile: 'jacksclub',
	region: 'eu-west-1',
	// stage: 'asd',
	defaults: {
		function: {
			environment: {
				BUGSNAG_API_KEY: 'test'
			}
		},
		graphql: {
			api: {
				authorization: {
					authorizer: __dirname + '/function.ts',
				}
			}
		}
	},
	stacks: [
		tableStack,
		queueStack,
		storeStack,
		functionStack,
		graphqlOneStack,
		graphqlTwoStack,
		topicStack,
		cronStack,
		// searchStack,
	]
} satisfies AppConfig
