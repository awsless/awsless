import { footer } from "./footer.js"
import { ProgramOptions, program } from "../../program.js"
import { Config, importConfig } from "../../../config.js"
import { header } from "./header.js"
import { dialog } from "./dialog.js"
import { debug, debugError } from "../../logger.js"
import { Terminal, createTerminal } from "../../lib/terminal.js"
import { Renderer } from "../../lib/renderer.js"
import { logo } from "./logo.js"

export const layout = async (cb:(config:Config, write: Renderer['write'], term: Terminal) => Promise<void> | void) => {
	const term = createTerminal()
	term.out.clear()
	term.out.write(logo())

	try {
		const options = program.optsWithGlobals() as ProgramOptions
		const config = await importConfig(options)

		// render header
		term.out.write(header(config))

		// render page
		await cb(config, term.out.write.bind(term.out), term)
	} catch(error) {
		if(error instanceof Error) {
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
		term.out.write(footer())
		term.in.unref()

		setTimeout(() => {
			process.exit(0)
		}, 100)
	}
}
