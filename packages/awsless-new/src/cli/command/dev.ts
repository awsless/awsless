import { Command } from 'commander'
import { layout } from '../ui/complex/layout.js'
import { buildTypes } from '../ui/complex/build-types.js'
import { watchConfig } from '../../config/load/watch.js'
import { logError } from '../ui/error/error.js'

export const dev = (program: Command) => {
	program
		.command('dev')
		.description('Start the development service')
		.action(async () => {
			await layout('dev', async props => {
				await buildTypes(props)

				await watchConfig(
					props.options,
					async props => {
						await buildTypes(props)
					},
					error => {
						logError(error)
					}
				)

				// We should give features the opportunity to watch for files aswell.
				// features.map()

				// idle forever...
				await new Promise(() => {})
			})
		})
}
