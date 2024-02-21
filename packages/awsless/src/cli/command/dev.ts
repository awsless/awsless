import { Command } from 'commander'
import { layout } from '../ui/layout/layout.js'
import { cleanUp } from '../../util/cleanup.js'
import { typesGenerator } from '../ui/complex/types.js'
import { watchConfig } from '../../config/watch.js'
import { ProgramOptions } from '../program.js'
import { configError } from '../ui/error/config.js'
import { dialog } from '../ui/layout/dialog.js'
import { ConfigError, FileError } from '../error.js'
import { fileError } from '../ui/error/file.js'
// import { plugins } from '../../plugins/index.js'

export const dev = (program: Command) => {
	program
		.command('dev')
		.description('Start the development service')
		.action(async () => {
			await layout(async (config, write) => {
				const options = program.optsWithGlobals() as ProgramOptions

				await cleanUp()
				await write(typesGenerator(config))

				await watchConfig(
					options,
					async config => {
						await cleanUp()
						await write(typesGenerator(config))
					},
					error => {
						if (error instanceof FileError) {
							write(fileError(error))
						} else if (error instanceof ConfigError) {
							write(configError(error))
						} else if (error instanceof Error) {
							write(dialog('error', [error.message]))
						} else if (typeof error === 'string') {
							write(dialog('error', [error]))
						} else {
							write(dialog('error', [JSON.stringify(error)]))
						}
					}
				)

				// We should give plugins the opportunity to watch for files aswell.
				// plugins.map()

				// idle forever...
				await new Promise(() => {})
			})
		})
}
