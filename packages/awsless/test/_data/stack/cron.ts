import { StackConfig } from "../../../src";

export const cronStack:StackConfig = {
	name: 'cron',
	crons: {
		cron: {
			consumer: 'test/_data/function.ts',
			schedule: 'rate(1 day)',
		}
	},
}
