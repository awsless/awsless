#!/usr/bin/env bun

import { program } from './cli/program.js'

const interrupt = (signal: NodeJS.Signals, code: number) => () => {
	// A signal skips the spinner teardown that would show the cursor again.
	process.stdout.write('\x1b[?25h')

	// Commands like dev & logs listen for their own interrupt & exit gracefully.
	if (signal === 'SIGINT' && process.listenerCount(signal) > 1) {
		return
	}

	process.exit(code)
}

process.on('SIGINT', interrupt('SIGINT', 130))
process.on('SIGTERM', interrupt('SIGTERM', 143))

program.parse(process.argv)
