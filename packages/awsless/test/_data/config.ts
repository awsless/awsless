// import { AppConfig } from "../../src/app";
// import { StackConfig } from "../../src/stack";

import { AppConfig, StackConfig } from "../../src"

const statsStack = {
	name: 'stats',
	tables: {
		stats: {
			hash: 'id',
			fields: {
				id: 'string'
			}
		}
	}
} satisfies StackConfig

const betStack = {
	name: 'bet',
	depends: [ statsStack ],
	queues: {
		process: 'test/_data/function.ts'
	}
} satisfies StackConfig

const diceStack = {
	name: 'dice',
	depends: [ statsStack, betStack ],
	stores: [ 'files' ],
	// topics: {
	// 	event: 'test/_data/function.ts'
	// }
} satisfies StackConfig

const walletStack = {
	name: 'wallet',
	depends: [ statsStack ],
	functions: {
		bet: 'test/_data/function.ts'
	}
} satisfies StackConfig

const siteStack = {
	name: 'site',
	crons: {
		// name: {
		// 	consumer:
		// 	schedule: 'cron(* * * * * *)'
		// }
	},
} satisfies StackConfig

export default {
	name: 'app',
	profile: 'jacksclub',
	region: 'eu-west-1',
	stage: 'asd',
	// defaults: {

	// },
	stacks: [
		statsStack,
		betStack,
		diceStack,
		walletStack,
	]
} satisfies AppConfig
