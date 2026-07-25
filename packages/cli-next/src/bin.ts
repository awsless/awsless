#!/usr/bin/env bun

import { program } from './cli/program.js'
// @ts-ignore

// import stayAwake from 'stay-awake'
// stayAwake.prevent()

// process.env.AWSLESS_CLI = '1'

const interrupt = (code: number) => () => {
	// A signal skips the spinner teardown that would show the cursor again.
	process.stdout.write('\x1b[?25h')
	process.exit(code)
}

process.on('SIGINT', interrupt(130))
process.on('SIGTERM', interrupt(143))

program.parse(process.argv)
