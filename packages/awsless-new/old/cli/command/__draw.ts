import { Command } from 'commander'
import { layout } from '../ui/layout/layout.js'
import { toApp } from '../../app.js'
import { runTester } from '../ui/complex/tester.js'
import { dialog } from '../ui/layout/dialog.js'
import { table } from '../ui/layout/__table.js'
import { runTaskGroup } from '../ui/complex/task-group.js'

export const draw = (program: Command) => {
	program
		.command('draw')
		.description('Test your app')
		.action(async () => {
			await layout(async (config, write) => {
				await write(
					runTaskGroup(1, [
						{
							label: 'stack-1',
							task: async update => {
								update('Loading...')
								await new Promise(resolve => setTimeout(resolve, 1000))
								update('Done')
								return 'warn'
							},
						},
						{
							label: 'stack-2',
							task: async update => {
								update('Loading...')
								await new Promise(resolve => setTimeout(resolve, 1000))
								update('Done')
								return 'done'
							},
						},
					])
				)
			})
		})
}
