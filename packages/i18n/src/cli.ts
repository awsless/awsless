#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { translateProject } from './command'

const usage = `Usage: translate [--config <vite config file>]

Translates the missing texts with the i18n plugin from your Vite config,
without building. Run it from the project root.`

const args = () => {
	try {
		return parseArgs({
			options: {
				config: { type: 'string', short: 'c' },
				help: { type: 'boolean', short: 'h' },
			},
		}).values
	} catch (error) {
		console.error(`${error instanceof Error ? error.message : error}\n\n${usage}`)
		process.exit(1)
	}
}

const values = args()

if (values.help) {
	console.log(usage)
	process.exit(0)
}

try {
	await translateProject(
		{ configFile: values.config },
		{
			info: message => console.log(message),
			warn: message => console.warn(message),
		}
	)
} catch (error) {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
}
