import { Config } from './config'
import { Binding, toStack } from './stack'
import { StackNode, createDependencyTree } from './util/deployment'
import { debug } from './cli/logger'
import { style } from './cli/style'
import { StackConfig } from './schema/stack'
import { defaultPlugins } from './plugins/index'
import { App } from './formation/app'
import { Stack } from './formation/stack'
import { Function } from './formation/resource/lambda/function'
import { extendWithGlobalExports } from './custom/global-export/extend'


const getAllDepends = (filters:StackConfig[]) => {
	const list:StackConfig[] = []
	const walk = (deps:StackConfig[]) => {
		deps.forEach(dep => {
			!list.includes(dep) && list.push(dep)
			dep.depends && walk(dep.depends)
		})
	}

	walk(filters)
	return list
}

export const toApp = async (config:Config, filters:string[]) => {

	const app = new App(config.name)
	const stacks:{ stack:Stack, config:StackConfig }[] = []
	const plugins = [
		...defaultPlugins,
		...(config.plugins || [])
	]

	debug('Plugins detected:', plugins.map(plugin => style.info(plugin.name)).join(', '))

	// ---------------------------------------------------------------

	const bootstrap = new Stack('bootstrap', config.region)
	const usEastBootstrap = new Stack('us-east-bootstrap', 'us-east-1')

	extendWithGlobalExports(config.name, usEastBootstrap, bootstrap)

	app.add(bootstrap, usEastBootstrap)

	// ---------------------------------------------------------------

	debug('Run plugin onApp listeners')

	const bindings:Binding[] = []
	const bind = (cb:Binding) => {
		bindings.push(cb)
	}

	for(const plugin of plugins) {
		plugin.onApp?.({
			config,
			app,
			bootstrap,
			usEastBootstrap,
			bind,
		})
	}

	// ---------------------------------------------------------------

	debug('Stack filters:', filters.map(filter => style.info(filter)).join(', '))

	const filterdStacks = (
		filters.length === 0
		? config.stacks
		: getAllDepends(
			// config.stacks,
			config.stacks.filter((stack) => filters.includes(stack.name))
		)
	)

	for(const stackConfig of filterdStacks) {
		const { stack } = toStack({
			config,
			stackConfig,
			bootstrap,
			usEastBootstrap,
			plugins,
			app,
		})

		app.add(stack)

		stacks.push({ stack, config: stackConfig })
	}

	// ---------------------------------------------------------------

	const functions = app.find(Function)

	for(const bind of bindings) {
		for(const fn of functions) {
			bind(fn)
		}
	}

	// ---------------------------------------------------------------

	// const constructs = app.node.findAll()
	// const created:unknown[] = []

	// for(const construct of constructs) {
	// 	for(const resource of customResources) {
	// 		if(construct instanceof resource && !created.includes(resource)) {
	// 			created.push(resource)
	// 			resource.create(bootstrap.stack)
	// 		}
	// 	}
	// }

	// ---------------------------------------------------------------
	// Make a bootstrap stack if needed and add it to the
	// dependency tree

	let dependencyTree:StackNode[] = createDependencyTree(stacks)

	if(bootstrap.size > 0) {
		dependencyTree = [{
			stack: bootstrap,
			children: dependencyTree,
		}]
	}

	if(usEastBootstrap.size > 0) {
		dependencyTree = [{
			stack: usEastBootstrap,
			children: dependencyTree,
		}]
	}

	return {
		app,
		plugins,
		dependencyTree,
	}
}
