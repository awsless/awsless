// import { createDeploymentLine } from './util/deployment.js'
// import { debug } from './cli/logger.js'
// import { style } from './cli/style.js'
import { StackConfig } from './config/stack.js'
import { AppConfig } from './config/app.js'
import { App, Stack } from '@awsless/formation'
import { features } from './feature/index.js'
import { OnFunctionEntry, OnFunctionListener } from './feature.js'
import { Builder } from './build/index.js'

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

export type CreateAppProps = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
}

export type TestCase = {
	name: string
	paths: string[]
}

export type BuildTask = {
	type: string
	name: string
	builder: Builder
}

export const createApp = (props: CreateAppProps, filters: string[] = []) => {
	const app = new App(props.appConfig.name)
	const base = new Stack('base')

	const tests: TestCase[] = []
	const builders: BuildTask[] = []
	const global: {
		listeners: OnFunctionListener[]
		functions: OnFunctionEntry[]
	} = {
		listeners: [],
		functions: [],
	}

	// ---------------------------------------------------------------

	// debug('Run plugin onApp listeners')

	for (const feature of features) {
		feature.onApp?.({
			...props,
			app,
			base,
			onFunction(callback) {
				global.listeners.push(callback)
			},
			registerFunction(lambda, policy) {
				global.functions.push({ lambda, policy })
			},
			registerTest(name, paths) {
				tests.push({ name, paths })
			},
			registerBuild(type, name, builder) {
				builders.push({ type, name, builder })
			},
		})
	}

	// ---------------------------------------------------------------
	// debug('Stack filters:', filters.map(filter => style.info(filter)).join(', '))

	let filterdStacks = props.stackConfigs
	if (filters.length > 0) {
		const filtersWithDeps = getFiltersWithDeps(filterdStacks, filters)
		// debug('Stack filters with deps:', filtersWithDeps.map(filter => style.info(filter)).join(', '))
		filterdStacks = filterdStacks.filter(stack => filtersWithDeps.includes(stack.name))
	}

	for (const stackConfig of filterdStacks) {
		// debug('Define stack:', style.info(name))

		const localListeners: OnFunctionListener[] = []
		const localFunctions: OnFunctionEntry[] = []

		const stack = new Stack(stackConfig.name)

		app.add(stack)

		for (const feature of features) {
			feature.onStack?.({
				...props,
				stackConfig,
				app,
				base,
				stack,
				onFunction(callback) {
					global.listeners.push(callback)
					localListeners.push(callback)
				},
				registerFunction(lambda, policy) {
					global.functions.push({ lambda, policy })
					localFunctions.push({ lambda, policy })
				},
				registerTest(name, paths) {
					tests.push({ name, paths })
				},
				registerBuild(type, name, builder) {
					builders.push({ type, name, builder })
				},
			})
		}

		// ---------------------------------------------------------------
		// Local stack binds

		for (const listener of localListeners) {
			for (const fn of localFunctions) {
				listener(fn)
			}
		}
	}

	// ---------------------------------------------------------------
	// Add base stack

	if (base.resources.length > 0) {
		app.add(base)
	}

	// ---------------------------------------------------------------
	// Global app binds

	for (const listener of global.listeners) {
		for (const fn of global.functions) {
			listener(fn)
		}
	}

	// ---------------------------------------------------------------
	// Stack dependency binds

	// for (const entry of stacks) {
	// 	for (const dep of entry.config.depends || []) {
	// 		const depStack = stacks.find(entry => entry.config.name === dep)
	// 		if (!depStack) {
	// 			throw new Error(`Stack dependency not found: ${dep}`)
	// 		}
	// 		const functions = entry.stack.find(Function)
	// 		for (const bind of depStack.bindings) {
	// 			for (const fn of functions) {
	// 				bind(fn)
	// 			}
	// 		}
	// 	}
	// }

	// ---------------------------------------------------------------
	// Make a bootstrap stack if needed and add it to the
	// dependency tree

	// const deploymentLine = createDeploymentLine(stacks)

	// if (bootstrap.size > 0) {
	// 	deploymentLine.unshift([bootstrap])
	// }
	// if (usEastBootstrap.size > 0) {
	// 	deploymentLine.unshift([usEastBootstrap])
	// }

	return {
		app,
		base,
		tests,
		builders,
		// deploymentLine,
	}
}
