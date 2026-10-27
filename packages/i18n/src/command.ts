import { type InlineConfig, type Plugin, resolveConfig } from 'vite'
import { type I18nPluginApi, type Logger, PLUGIN_NAME } from './vite'

// The plugin options live in the Vite config, reading them from there keeps
// one place to set the locales and translator.
export const translateProject = async (inlineConfig: InlineConfig, log: Logger) => {
	const config = await resolveConfig(inlineConfig, 'build', 'production', 'production')
	const plugin = config.plugins.find(plugin => plugin.name === PLUGIN_NAME) as Plugin<I18nPluginApi> | undefined

	if (!plugin?.api) {
		throw new Error(`The ${PLUGIN_NAME} plugin wasn't found in your Vite config.`)
	}

	await plugin.api.translate(process.cwd(), log)
}
