import { StackConfig } from '../../../old/index.js'

export const pubsubStack: StackConfig = {
	name: 'pubsub',
	pubsub: {
		connect: {
			sql: `SELECT * FROM '$aws/events/presence/connected/+'`,
			consumer: __dirname + '/../function/simple.ts',
		},
	},
}
