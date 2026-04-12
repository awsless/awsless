import { Config } from './config/config.js'
import { StackConfig } from './config/stack.js'
import { Plugin } from './plugin.js'
import { debug } from './cli/logger.js'
import { style } from './cli/style.js'
import { App } from './formation/app.js'
import { Function } from './formation/resource/lambda/function.js'
import { Stack } from './formation/stack.js'

export type Binding = (lambda: Function) => void

type Context = {
	config: Config
	app: App
	tests: Map<string, string[]>
	bootstrap: Stack
	usEastBootstrap: Stack
	stackConfig: StackConfig
	plugins: Plugin[]
}

export const toStack = ({ config, app, stackConfig, bootstrap, usEastBootstrap, plugins, tests }: Context) => {
	const name = stackConfig.name
	const stack = new Stack(name, config.app.region)
		.tag('app', config.app.name)
		.tag('stage', config.stage)
		.tag('stack', name)

	debug('Define stack:', style.info(name))

	// ------------------------------------------------------
	// Create all available resources from all plugins
	// ------------------------------------------------------

	debug('Run plugin onStack listeners')

	const bindings: Binding[] = []
	const bind = (cb: Binding) => {
		bindings.push(cb)
	}

	for (const plugin of plugins) {
		plugin.onStack?.({
			config,
			app,
			stack,
			stackConfig,
			bootstrap,
			usEastBootstrap,
			tests,
			bind,
		})
	}

	// ------------------------------------------------------
	// Check if stack has resources

	if (stack.size === 0) {
		throw new Error(`Stack ${style.info(name)} has no resources defined`)
	}

	// ------------------------------------------------------
	// Grant access to all stack lambda functions
	// ------------------------------------------------------

	const functions = stack.find(Function)

	for (const bind of bindings) {
		for (const fn of functions) {
			bind(fn)
		}
	}

	// const resources = stack.all()

	// for(const fn of functions) {
	// 	for(const resource of resources) {
	// 		const permissions = resource.permissions

	// 		if(permissions) {
	// 			fn.addPermissions(permissions)
	// 		}
	// 	}
	// }

	// ------------------------------------------------------
	// Give app/stage access to all config parameters

	// for(const fn of functions) {
	// 	fn.addPermissions({
	// 		actions: [
	// 			'ssm:GetParameter',
	// 			'ssm:GetParameters',
	// 			'ssm:GetParametersByPath',
	// 		],
	// 		resources: [
	// 			sub('arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter' + configParameterPrefix(config))
	// 		]
	// 	})
	// }

	return {
		stack,
		bindings,
		// depends: stackConfig.depends,
	}
}
