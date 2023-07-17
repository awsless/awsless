
import { AppConfig } from "../src/app"
import { Config } from "../src/config"
import { StackConfig } from "../src/stack"

export const error = {
	name: 'error',

	functions: {
		list: 'src/function/list.ts',
		retry: 'src/function/retry.ts',
		delete: 'src/function/delete.ts',
	},

	topics: {
		failure: 'src/function/capture.ts',
	},

	tables: {
		errors: {
			hashKey: 'id',
			fields: {
				id: 'string'
			},
			pointInTimeRecovery: true,
			indexes: {
				list: { hashKey: 'id' }
			},
		}
	}

} satisfies StackConfig


export const stats = {
	name: 'stats',

	functions: {
		log: 'src/function/log.ts',
		get: 'src/function/get.ts',
		list: 'src/function/list.ts',
	},

	crons: {
		test: {
			schedule: 'rate(5 minutes)',
			consumer: 'src/cron/test.ts',
		},
		archive: {
			schedule: 'cron(1 2 * * * *)',
			consumer: 'src/cron/archive.ts',
		},
	},

} satisfies StackConfig

export const bet = {
	name: 'bet',
	depends: [ stats ],

	functions: {
		place: 'src/function/place.ts',
		gameStart: 'src/function/game/start.ts',
	},

} satisfies StackConfig

export const dice = {
	name: 'dice',
	depends: [ bet ],

	// apis: {
	// 	'POST /game/dice': 'src/function/dice.ts',
	// },

} satisfies StackConfig


export const config = {
	name: 'rollin',
	region: 'eu-west-1',
	profile: '',
	stacks: [
		error,
		stats,
		bet,
		dice,
	],
} satisfies AppConfig
