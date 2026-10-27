#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolveConfig, type Plugin } from 'vite'
import { PLUGIN_NAME, type I18nPluginApi } from './vite'

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

function fail(message: unknown): never {
	console.error(message instanceof Error ? message.message : message)
	process.exit(1)
}

try {
	// The plugin options live in the Vite config, reading them from there keeps
	// one place to set the locales and translator.
	const config = await resolveConfig({ configFile: values.config }, 'build', 'production')
	const plugin = config.plugins.find(plugin => plugin.name === PLUGIN_NAME) as Plugin<I18nPluginApi> | undefined

	if (!plugin?.api) {
		fail(`The ${PLUGIN_NAME} plugin wasn't found in your Vite config.`)
	}

	await plugin.api.translate(process.cwd(), {
		info: message => console.log(message),
		warn: message => console.warn(message),
	})
} catch (error) {
	fail(error)
}
