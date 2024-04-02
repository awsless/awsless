import { StackConfig } from '../../../old/index.js'

export const cronStack: StackConfig = {
	name: 'cron',
	crons: {
		cron: {
			schedule: '1 days',
			consumer: __dirname + '/../function/simple.ts',
		},
	},
}
