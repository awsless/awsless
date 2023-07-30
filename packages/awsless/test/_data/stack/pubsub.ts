import { StackConfig } from "../../../src";

export const pubsubStack: StackConfig = {
	name: 'pubsub',
	pubsub: {
		connect: {
			sql: `SELECT * FROM '$aws/events/presence/connected/+'`,
			consumer: 'test/_data/function.ts',
		}
	}
}
