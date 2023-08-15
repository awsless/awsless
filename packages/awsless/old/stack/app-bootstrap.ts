import { App, Stack } from "aws-cdk-lib";
import { Config } from '../config.js';
import { defaultPlugins } from '../plugins/index.js';
import { Assets } from '../util/assets.js';
import { debug } from '../cli/logger.js';
import { Function } from "aws-cdk-lib/aws-lambda";

export const appBootstrapStack = ({ config, app, assets }: { config:Config, app:App, assets: Assets }) => {
	const stack = new Stack(app, 'bootstrap', {
		stackName: `${config.name}-bootstrap`,
		env: {
			account: config.account,
			region: config.region,
		},
	})

	const usEastStack = new Stack(app, 'us-east-bootstrap', {
		stackName: `${config.name}-us-east-bootstrap`,
		env: {
			account: config.account,
			region: 'us-east-1',
		},
	})

	const plugins = [
		...defaultPlugins,
		...(config.plugins || [])
	]

	debug('Run plugin onBootstrap listeners')

	const functions = plugins.map(plugin => plugin.onBootstrap?.({
		config,
		app,
		stack,
		assets,
		usEastStack,
	})).filter(Boolean).flat().filter(Boolean) as Function[]

	return {
		stack,
		usEastStack,
		functions,
	}
}
