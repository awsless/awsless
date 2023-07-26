import { App, Stack } from "aws-cdk-lib";
import { Config } from '../config.js';
import { defaultPlugins } from '../plugins/index.js';
import { Assets } from '../util/assets.js';
import { debug } from '../cli/logger.js';
import { Function } from "aws-cdk-lib/aws-lambda";

export const appBootstrapStack = ({ config, app, assets }: { config:Config, app:App, assets: Assets }) => {
	const stack = new Stack(app, 'bootstrap', {
		stackName: `${config.name}-bootstrap`,
	})

	const plugins = [
		...defaultPlugins,
		...(config.plugins || [])
	]

	debug('Run plugin onBootstrap listeners')
	// plugins.forEach(plugin => plugin.onBootstrap?.({ config, stack, app, assets }))

	const functions = plugins.map(plugin => plugin.onBootstrap?.({
		config,
		app,
		stack,
		assets,
	})).filter(Boolean).flat().filter(Boolean) as Function[]

	return {
		stack,
		functions,
	}
}
