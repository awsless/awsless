import { App, Stack } from "aws-cdk-lib";
import { Config } from "../config";
import { defaultPlugins } from "../plugins";
import { Assets } from "../util/assets";
import { debug } from "../cli/logger";

export const appBootstrapStack = ({ config, app, assets }: { config:Config, app:App, assets: Assets }) => {
	const stack = new Stack(app, 'bootstrap', {
		stackName: `${config.name}-bootstrap`,
	})

	const plugins = [
		...defaultPlugins,
		...(config.plugins || [])
	]

	debug('Run plugin onBootstrap listeners')
	plugins.forEach(plugin => plugin.onBootstrap?.({ config, stack, app, assets }))

	return stack
}
