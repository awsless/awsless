
import { AppConfig, StackConfig } from "../../src"

const tableStack = {
	name: 'table',
	tables: {
		stats: {
			hash: 'id',
			fields: {
				id: 'string'
			}
		}
	}
} satisfies StackConfig

const queueStack = {
	name: 'queue',
	queues: {
		process: 'test/_data/function.ts'
	}
} satisfies StackConfig

const storeStack = {
	name: 'store',
	stores: [ 'files' ],
} satisfies StackConfig

const functionStack = {
	name: 'function',
	functions: {
		bet: 'test/_data/function.ts'
	},
} satisfies StackConfig

const topicStack = {
	name: 'topic',
	topics: {
		event: 'test/_data/function.ts'
	},
} satisfies StackConfig

const cronStack = {
	name: 'cron',
	crons: {
		cron: {
			consumer: 'test/_data/function.ts',
			schedule: 'rate(1 day)',
		}
	},
} satisfies StackConfig

const searchStack = {
	name: 'search',
	searchs: [
		'games'
	]
} satisfies StackConfig

export default {
	name: 'app',
	profile: 'jacksclub',
	region: 'eu-west-1',
	stage: 'asd',
	stacks: [
		tableStack,
		queueStack,
		storeStack,
		functionStack,
		topicStack,
		cronStack,
		searchStack,
	]
} satisfies AppConfig
