import { StackConfig } from "../../../src";

export const cronStack:StackConfig = {
	name: 'cron',
	crons: {
		cron: {
			schedule: 'rate(1 day)',
			consumer: __dirname + '/../function/simple.ts',
		}
	},
}
