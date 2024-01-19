import { Config } from './config/config.js'
import { Binding, toStack } from './stack.js'
import { createDeploymentLine } from './util/deployment.js'
import { debug } from './cli/logger.js'
import { style } from './cli/style.js'
import { StackConfig } from './config/stack.js'
import { plugins } from './plugins/index.js'
import { App } from './formation/app.js'
import { Stack } from './formation/stack.js'
import { Function } from './formation/resource/lambda/function.js'
// import { extendWithGlobalExports } from './custom/global-export/extend.js'

const getFiltersWithDeps = (stacks: StackConfig[], filters: string[]) => {
	const list: string[] = []
	const walk = (deps: string[]) => {
		deps.forEach(dep => {
			const stack = stacks.find(stack => stack.name === dep)
			if (stack) {
				if (!list.includes(dep)) {
					list.push(dep)
					if (stack.depends) {
						walk(stack.depends)
					}
				}
			}
		})
	}

	walk(filters)
	return list
}
// const getAllDepends = (stacks: StackConfig[], filters: string[]) => {
// 	const list: StackConfig[] = []
// 	const walk = (deps: StackConfig[]) => {
// 		deps.forEach(dep => {
// 			!list.includes(dep) && list.push(dep)
// 			dep.depends && walk(dep.depends)
// 		})
// 	}

// 	walk(filters)
// 	return list
// }

export const toApp = async (config: Config, filters: string[]) => {
	const app = new App(config.app.name)
	const stacks: { stack: Stack; config: StackConfig; bindings: Binding[] }[] = []
	const tests = new Map<string, string[]>()

	debug('Plugins detected:', plugins.map(plugin => style.info(plugin.name)).join(', '))

	// ---------------------------------------------------------------

	const bootstrap = new Stack('bootstrap', config.app.region)
	const usEastBootstrap = new Stack('us-east-bootstrap', 'us-east-1')

	// extendWithGlobalExports(config.name, usEastBootstrap, bootstrap)

	// ---------------------------------------------------------------

	debug('Run plugin onApp listeners')

	const bindings: Binding[] = []
	const bind = (cb: Binding) => {
		bindings.push(cb)
	}

	for (const plugin of plugins) {
		plugin.onApp?.({
			config,
			app,
			bootstrap,
			usEastBootstrap,
			bind,
			tests,
		})
	}

	// ---------------------------------------------------------------

	debug('Stack filters:', filters.map(filter => style.info(filter)).join(', '))

	let filterdStacks = config.stacks
	if (filters.length > 0) {
		const filtersWithDeps = getFiltersWithDeps(filterdStacks, filters)
		debug('Stack filters with deps:', filtersWithDeps.map(filter => style.info(filter)).join(', '))

		filterdStacks = filterdStacks.filter(stack => filtersWithDeps.includes(stack.name))
	}

	for (const stackConfig of filterdStacks) {
		const { stack, bindings } = toStack({
			config,
			stackConfig,
			bootstrap,
			usEastBootstrap,
			plugins,
			tests,
			app,
		})

		app.add(stack)

		stacks.push({ stack, config: stackConfig, bindings })
	}

	// debug(app.stacks)

	// ---------------------------------------------------------------

	if (bootstrap.size > 0) {
		app.add(bootstrap)
	}

	if (usEastBootstrap.size > 0) {
		app.add(usEastBootstrap)
	}

	// ---------------------------------------------------------------

	// for (const plugin of plugins) {
	// 	for (const stack of app.stacks) {
	// 		for (const resource of stack) {
	// 			plugin.onResource?.({
	// 				config,
	// 				app,
	// 				stack,
	// 				bootstrap,
	// 				usEastBootstrap,
	// 				resource,
	// 			})
	// 		}
	// 	}
	// }

	// ---------------------------------------------------------------
	// Global binds

	const functions = app.find(Function)

	for (const bind of bindings) {
		for (const fn of functions) {
			bind(fn)
		}
	}

	// ---------------------------------------------------------------
	// Stack dependency binds

	for (const entry of stacks) {
		for (const dep of entry.config.depends || []) {
			const depStack = stacks.find(entry => entry.config.name === dep)

			if (!depStack) {
				throw new Error(`Stack dependency not found: ${dep}`)
			}

			const functions = entry.stack.find(Function)

			for (const bind of depStack.bindings) {
				for (const fn of functions) {
					bind(fn)
				}
			}
		}
	}

	// ---------------------------------------------------------------
	// Make a bootstrap stack if needed and add it to the
	// dependency tree

	const deploymentLine = createDeploymentLine(stacks)

	if (bootstrap.size > 0) {
		deploymentLine.unshift([bootstrap])
	}

	if (usEastBootstrap.size > 0) {
		deploymentLine.unshift([usEastBootstrap])
	}

	// let dependencyTree:StackNode[] = createDependencyTree(stacks)

	// if(bootstrap.size > 0) {
	// 	dependencyTree = [{
	// 		stack: bootstrap,
	// 		children: dependencyTree,
	// 	}]
	// }

	// if(usEastBootstrap.size > 0) {
	// 	dependencyTree = [{
	// 		stack: usEastBootstrap,
	// 		children: dependencyTree,
	// 	}]
	// }

	return {
		app,
		plugins,
		deploymentLine,
		tests,
	}
}
