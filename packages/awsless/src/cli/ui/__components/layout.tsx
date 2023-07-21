// import { useEffect } from "react"
// import { Header } from "./config.js"
import { ProgramOptions, program } from "../../program.js"
import { Config, importConfig } from "../../../config.js"
import { Box, Text, render, useStdin, useStdout } from "ink"
import { Logo } from "./logo.js"
import { List } from "./list.js"
import { useEffect, useState } from "react"
import { symbol } from "zod"
import { symbols } from "../../style.js"

export const Layout = (props:{ render: (config:Config, render: (child:any) => void) => Promise<void> | void }) => {

	const [ config, setConfig ] = useState<Config | undefined>(undefined)
	const [ children, setChildren ] = useState<any[]>([])
	const [ error, setError ] = useState<string | undefined>(undefined)
	const [ done, setDone ] = useState<boolean>(false)

	const init = async () => {
		try {
			const options = program.optsWithGlobals() as ProgramOptions
			const config = await importConfig(options)
			setConfig(config)

			await props.render(config, (child) => {
				setChildren((children) => [...children, child])
			})
		} catch(error) {
			if(error instanceof Error) {
				setError(error.message)
			} else if(typeof error === 'string') {
				setError(error)
			} else {
				setError(JSON.stringify(error))
			}
		} finally {
			setDone(true)
		}
	}

	useEffect(() => {
		init()
	}, [])

	const { stdout } = useStdout()

	return (
		<Box flexDirection="column" width='100%' gap={1} paddingTop={1} paddingBottom={1} borderStyle={'bold'}>
			<Logo />
			{ config && (
				<Box paddingLeft={2}>
					<List data={{
						App: config.name,
						Stage: config.stage,
						Region: config.region,
						Profile: config.profile,
						Width: stdout.rows.toString()
					}} />
				</Box>
			)}
			{children}
			{ error && (
				<Box>
					<Text color='red'>{symbols.error}</Text>
					<Text>{error}</Text>
				</Box>
			)}
			{ done && (
				<Box paddingLeft={2}>
					<Text>Done!</Text>
				</Box>
			)}
		</Box>
	)
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
