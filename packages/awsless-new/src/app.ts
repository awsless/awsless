// import { createDeploymentLine } from './util/deployment.js'
// import { debug } from './cli/logger.js'
// import { style } from './cli/style.js'
import { App, aws, Input, Stack } from '@awsless/formation'
import { Builder } from './build/index.js'
import { Command } from './command.js'
import { AppConfig } from './config/app.js'
import { StackConfig } from './config/stack.js'
import { FileError } from './error.js'
import { OnEnvListener, OnPolicyListener, OnReadyListener } from './feature.js'
import { features } from './feature/index.js'
import { SharedData } from './shared.js'
import { generateGlobalAppId } from './util/name.js'

// const getFiltersWithDeps = (stacks: StackConfig[], filters: string[]) => {
// 	const list: string[] = []
// 	const walk = (deps: string[]) => {
// 		deps.forEach(dep => {
// 			const stack = stacks.find(stack => stack.name === dep)
// 			if (stack) {
// 				if (!list.includes(dep)) {
// 					list.push(dep)
// 					if (stack.depends) {
// 						walk(stack.depends)
// 					}
// 				}
// 			}
// 		})
// 	}

// 	walk(filters)
// 	return list
// }

const assertDepsExists = (stack: StackConfig, stacks: StackConfig[]) => {
	for (const dep of stack.depends ?? []) {
		const found = stacks.find(i => i.name === dep)
		if (!found) {
			throw new FileError(stack.file, `Stack "${stack.name}" depends on a stack "${dep}" that doesn't exist.`)
		}
	}
}

export type CreateAppProps = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
}

export type TestCase = {
	stackName: string
	name: string
	paths: string[]
}

export type BuildTask = {
	stackName: string
	type: string
	name: string
	builder: Builder
}

export type BindEnv = {
	name: string
	value: Input<string>
}

export const createApp = (props: CreateAppProps) => {
	const app = new App(props.appConfig.name)
	app.setTag('app', app.name)

	const base = new Stack(app, 'base')
	base.setTag('stack', base.name)

	const shared = new SharedData()
	const appId = generateGlobalAppId({
		accountId: props.accountId,
		region: props.appConfig.region,
		appName: props.appConfig.name,
	})

	// const envVars: Record<string, Input<string>> = {}
	// const siteFunctions: aws.lambda.Function[] = []
	const commands: Command[] = []
	const configs = new Set<string>()
	const tests: TestCase[] = []
	const builders: BuildTask[] = []

	const readyListeners: OnReadyListener[] = []

	const binds: BindEnv[] = []
	const bindListeners: OnEnvListener[] = []

	const globalEnv: BindEnv[] = []
	const globalEnvListeners: OnEnvListener[] = []
	const allLocalEnv: Record<string, BindEnv[]> = {}
	const allLocalEnvListeners: Record<string, OnEnvListener[]> = {}

	const globalPolicies: aws.iam.RolePolicy[] = []
	const globalPoliciesListeners: OnPolicyListener[] = []
	const appPolicies: aws.iam.RolePolicy[] = []
	const appPoliciesListeners: OnPolicyListener[] = []
	const allStackPolicies: Record<string, aws.iam.RolePolicy[]> = {}
	const allStackPolicyListeners: Record<string, OnPolicyListener[]> = {}

	// ---------------------------------------------------------------
	// Run some checks

	for (const stackConfig of props.stackConfigs) {
		assertDepsExists(stackConfig, props.stackConfigs)
	}

	// ---------------------------------------------------------------

	for (const feature of features) {
		feature.onBefore?.({
			...props,
			app,
			appId,
			base,
			shared,
		})
	}

	// ---------------------------------------------------------------

	for (const feature of features) {
		feature.onApp?.({
			...props,
			app,
			appId,
			base,
			shared,
			onGlobalPolicy(callback) {
				globalPoliciesListeners.push(callback)
			},
			onAppPolicy(callback) {
				appPoliciesListeners.push(callback)
			},
			registerPolicy(policy) {
				globalPolicies.push(policy)
				appPolicies.push(policy)
			},
			registerBuild(type, name, builder) {
				builders.push({
					stackName: base.name,
					type,
					name,
					builder,
				})
			},
			registerCommand(command) {
				commands.push(command)
			},
			bind(name, value) {
				binds.push({ name, value })
			},
			onBind(cb) {
				bindListeners.push(cb)
			},
			addEnv(name, value) {
				globalEnv.push({ name, value })
			},
			onEnv(cb) {
				globalEnvListeners.push(cb)
			},
			onReady(cb) {
				readyListeners.push(cb)
			},
		})
	}

	// ---------------------------------------------------------------
	// debug('Stack filters:', filters.map(filter => style.info(filter)).join(', '))

	// let filterdStacks = props.stackConfigs
	// if (filters.length > 0) {
	// 	const filtersWithDeps = getFiltersWithDeps(filterdStacks, filters)
	// 	// debug('Stack filters with deps:', filtersWithDeps.map(filter => style.info(filter)).join(', '))
	// 	filterdStacks = filterdStacks.filter(stack => filtersWithDeps.includes(stack.name))
	// }

	for (const stackConfig of props.stackConfigs) {
		// checkDepsExists(stackConfig, props.stackConfigs)

		const stack = new Stack(app, stackConfig.name)
		stack.setTag('stack', stack.name)

		const stackPolicyListeners: OnPolicyListener[] = []
		const stackPolicies: aws.iam.RolePolicy[] = []

		const localEnvListeners: OnEnvListener[] = []
		const localEnv: BindEnv[] = []

		allStackPolicyListeners[stack.name] = stackPolicyListeners
		allStackPolicies[stack.name] = stackPolicies

		allLocalEnvListeners[stack.name] = localEnvListeners
		allLocalEnv[stack.name] = localEnv

		for (const feature of features) {
			feature.onStack?.({
				...props,
				stackConfig,
				app,
				appId,
				base,
				stack,
				shared,
				onGlobalPolicy(callback) {
					globalPoliciesListeners.push(callback)
				},
				onAppPolicy(callback) {
					appPoliciesListeners.push(callback)
				},
				onStackPolicy(callback) {
					stackPolicyListeners.push(callback)
				},
				registerPolicy(policy) {
					globalPolicies.push(policy)
					stackPolicies.push(policy)
				},
				// registerPolicy(policy) {
				// 	globalPolicies.push(policy)
				// 	localPolicies.push(policy)
				// },
				registerTest(name, paths) {
					tests.push({
						stackName: stack.name,
						name,
						paths,
					})
				},
				registerBuild(type, name, builder) {
					builders.push({
						stackName: stack.name,
						type,
						name,
						builder,
					})
				},
				registerConfig(name) {
					configs.add(name)
				},
				registerCommand(command) {
					commands.push(command)
				},
				// registerSiteFunction(lambda) {
				// 	siteFunctions.push(lambda)
				// },
				// bindEnv(name, value) {
				// 	binds.push({ name, value })
				// },
				bind(name, value) {
					binds.push({ name, value })
				},
				onBind(cb) {
					bindListeners.push(cb)
				},
				addEnv(name, value) {
					localEnv.push({ name, value })
				},
				onEnv(cb) {
					localEnvListeners.push(cb)
				},
				onReady(cb) {
					readyListeners.push(cb)
				},
			})
		}

		// ---------------------------------------------------------------
		// Local stack binds

		// for (const listener of localFunctionListeners) {
		// 	for (const fn of localFunctions) {
		// 		listener(fn)
		// 	}
		// }

		for (const listener of stackPolicyListeners) {
			for (const policy of stackPolicies) {
				listener(policy)
			}
		}

		for (const listener of localEnvListeners) {
			for (const env of localEnv) {
				listener(env.name, env.value)
			}
		}
	}

	// ---------------------------------------------------------------
	// Global app binds

	// for (const listener of allFunctionListeners) {
	// 	for (const fn of allFunctions) {
	// 		listener(fn)
	// 	}
	// }

	for (const listener of appPoliciesListeners) {
		for (const fn of appPolicies) {
			listener(fn)
		}
	}

	for (const listener of globalPoliciesListeners) {
		for (const fn of globalPolicies) {
			listener(fn)
		}
	}

	for (const listener of globalEnvListeners) {
		for (const env of globalEnv) {
			listener(env.name, env.value)
		}
	}

	// ---------------------------------------------------------------
	// Site env binds

	// for (const lambda of siteFunctions) {
	// 	for (const { name, value } of binds) {
	// 		lambda.addEnvironment(name, value)
	// 	}
	// }

	// ---------------------------------------------------------------
	// Stack dependency binds

	for (const stackConfig of props.stackConfigs) {
		// const functions = allLocalFunctions[stackConfig.name]!
		const policies = allStackPolicies[stackConfig.name]!
		const envListeners = allLocalEnvListeners[stackConfig.name]!

		for (const dependency of stackConfig.depends ?? []) {
			// const functionListeners = allLocalFunctionListeners[dependency]!
			const policyListeners = allStackPolicyListeners[dependency]!
			const env = allLocalEnv[dependency]!

			// for (const fn of functions) {
			// 	for (const listener of functionListeners) {
			// 		listener(fn)
			// 	}
			// }

			for (const policy of policies) {
				for (const listener of policyListeners) {
					listener(policy)
				}
			}

			for (const entry of env) {
				for (const listener of envListeners) {
					listener(entry.name, entry.value)
				}
			}
		}
	}

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
	// Ready!

	for (const listener of readyListeners) {
		listener()
	}

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
		binds,
		shared,
		configs,
		builders,
		commands,
		// deploymentLine,
	}
}
