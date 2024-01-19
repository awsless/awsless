import { Command } from 'commander'
import { layout } from '../ui/layout/layout.js'
import { cleanUp } from '../../util/cleanup.js'
import { typesGenerator } from '../ui/complex/types.js'
import { watchConfig } from '../../config/watch.js'
import { ProgramOptions } from '../program.js'
import { zodError } from '../ui/layout/zod-error.js'
import { dialog } from '../ui/layout/dialog.js'
import { ConfigError } from '../../config/load.js'

export const dev = (program: Command) => {
	program
		.command('dev')
		.description('Start the development service')
		.action(async () => {
			await layout(async (_, write) => {
				const options = program.optsWithGlobals() as ProgramOptions

				await watchConfig(
					options,
					async config => {
						await cleanUp()
						await write(typesGenerator(config))
					},
					error => {
						if (error instanceof ConfigError) {
							write(zodError(error))
						} else if (error instanceof Error) {
							write(dialog('error', [error.message]))
						} else if (typeof error === 'string') {
							write(dialog('error', [error]))
						} else {
							write(dialog('error', [JSON.stringify(error)]))
						}
					}
				)
			})
		})
}
