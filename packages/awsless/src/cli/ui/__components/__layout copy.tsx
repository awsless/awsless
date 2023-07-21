// import { useEffect } from "react"
// import { Header } from "./config.js"
import { ProgramOptions, program } from "../../program.js"
import { Config, importConfig } from "../../../config.js"
import { Box, render } from "ink"
import { Logo } from "./logo.js"
import { debug } from "console"
import { List } from "./list.js"

export const renderLayout = async (cb:(config:Config) => Promise<void> | void) => {
	try {
		render(<Logo />)

		const options = program.optsWithGlobals() as ProgramOptions
		const config = await importConfig(options)

		render(
			<Box flexDirection='column' height={4} paddingLeft={2}>
				<List data={{
					App: config.name,
					Stage: config.stage,
					Region: config.region,
					Profile: config.profile,
				}} />
			</Box>
		)

		await cb(config)
	} catch(error) {
		// if(error instanceof Error) {
		// 	term.out.write(dialog('error', [ error.message ]))
		// } else if (typeof error === 'string') {
		// 	term.out.write(dialog('error', [ error ]))
		// } else {
		// 	term.out.write(dialog('error', [ JSON.stringify(error) ]))
		// }

		// debugError(error)

	} finally {
		debug('Exit')

		// render(<Logo />)

		// render footer
		// term.out.write(footer())
		// term.in.unref()

		// setTimeout(() => {
		// 	process.exit(0)
		// }, 50)
	}
}


// import { footer } from "./footer.js"
// import { ProgramOptions, program } from "../../program.js"
// import { Config, importConfig } from "../../../config.js"
// import { header } from "./header.js"
// import { dialog } from "./dialog.js"
// import { debug, debugError } from "../../logger.js"
// import { Terminal, createTerminal } from "../../lib/terminal.js"
// import { Renderer } from "../../lib/renderer.js"

// export const layout = async (cb:(config:Config, write: Renderer['write'], term: Terminal) => Promise<void> | void) => {
// 	const term = createTerminal()
// 	term.out.clear()

// 	try {
// 		const options = program.optsWithGlobals() as ProgramOptions
// 		const config = await importConfig(options)

// 		// render header
// 		term.out.write(header(config))

// 		// render page
// 		await cb(config, term.out.write.bind(term.out), term)
// 	} catch(error) {
// 		if(error instanceof Error) {
// 			term.out.write(dialog('error', [ error.message ]))
// 		} else if (typeof error === 'string') {
// 			term.out.write(dialog('error', [ error ]))
// 		} else {
// 			term.out.write(dialog('error', [ JSON.stringify(error) ]))
// 		}

// 		debugError(error)

// 	} finally {
// 		debug('Exit')

// 		// render footer
// 		term.out.write(footer())
// 		term.in.unref()

// 		setTimeout(() => {
// 			process.exit(0)
// 		}, 50)
// 	}
// }
