import { footer } from "./footer"
import { ProgramOptions, program } from "../../program"
import { Config, importConfig } from "../../../config"
import { header } from "./header"
import { dialog } from "./dialog"
import { debug, debugError } from "../../logger"
import { Terminal, createTerminal } from "../../lib/terminal"
import { Renderer } from "../../lib/renderer"

export const layout = async (cb:(config:Config, write: Renderer['write'], term: Terminal) => Promise<void> | void) => {
	const term = createTerminal()
	term.out.clear()

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
		}, 50)
	}
}
