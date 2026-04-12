import { Terminal } from "../terminal"
import { footer } from "./footer"
import { ProgramOptions, program } from "../../../../src/cli/program"
import { Config, importConfig } from "../../../../src/config"
import { header } from "./header"
import { dialog } from "./dialog"
import { debugError } from "../../../../src/cli/logger"

export const layout = async (cb:(config:Config, write: Terminal['write'], term: Terminal) => Promise<void> | void) => {
	const term = new Terminal()

	term.hideCursor()
	term.clear()

	try {
		const options = program.optsWithGlobals() as ProgramOptions
		const config = await importConfig(options)

		// render header
		term.write(header(config))

		// render page
		await cb(config, term.write, term)
	} catch(error) {
		if(error instanceof Error) {
			term.write(dialog('error', [ error.message ]))
		} else if (typeof error === 'string') {
			term.write(dialog('error', [ error ]))
		} else {
			term.write(dialog('error', [ JSON.stringify(error) ]))
		}

		debugError(error)

	} finally {
		term.showCursor()
		term.input.unref()

		// render footer
		term.write(footer())
	}
}
