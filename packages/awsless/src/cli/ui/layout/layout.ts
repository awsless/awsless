import { ProgramOptions, program } from '../../program.js'
import { Config, ConfigError, importConfig } from '../../../config.js'
import { header } from './header.js'
import { dialog } from './dialog.js'
import { debug, debugError } from '../../logger.js'
import { Terminal, createTerminal } from '../../lib/terminal.js'
import { Renderer } from '../../lib/renderer.js'
import { logo } from './logo.js'
import { logs } from './logs.js'
import { br } from './basic.js'
import { zodError } from './zod-error.js'

export const layout = async (cb:(config:Config, write: Renderer['write'], term: Terminal) => Promise<void> | void) => {
	const term = createTerminal()
	await term.out.clear()

	term.out.write(br())
	term.out.write(logo())
	term.out.gap()

	try {
		const options = program.optsWithGlobals() as ProgramOptions
		const config = await importConfig(options)

		// render header
		term.out.write(header(config))
		term.out.gap()

		// render page
		await cb(config, term.out.write.bind(term.out), term)
	} catch(error) {

		term.out.gap()

		if(error instanceof ConfigError) {
			term.out.write(zodError(error.error, error.data))
		} else if(error instanceof Error) {
			term.out.write(dialog('error', [ error.message ]))
		} else if (typeof error === 'string') {
			term.out.write(dialog('error', [ error ]))
		} else {
			term.out.write(dialog('error', [ JSON.stringify(error) ]))
		}

		debugError(error)

	} finally {
		debug('Exit')

		// render footer
		term.out.gap()
		term.out.write(logs())
		// term.out.gap()
		await term.out.end()

		term.in.unref()

		setTimeout(() => {
			process.exit(0)
		}, 100)
	}
}
