// import { createDeploymentLine } from './util/deployment.js'
// import { debug } from './cli/logger.js'
// import { style } from './cli/style.js'
import { App, aws, Input, Stack } from '@awsless/formation'
import { Builder } from './build/index.js'
import { AppConfig } from './config/app.js'
import { StackConfig } from './config/stack.js'
import { OnEnvListener, OnPolicyListener, OnReadyListener } from './feature.js'
import { features } from './feature/index.js'
import { SharedData } from './shared.js'

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

export type BindEnv = {
	name: string
	value: Input<string>
}

export const createApp = (props: CreateAppProps, filters: string[] = []) => {
	const app = new App(props.appConfig.name)
	const base = new Stack(app, 'base')
	const shared = new SharedData()

	// const envVars: Record<string, Input<string>> = {}
	const siteFunctions: aws.lambda.Function[] = []
	const configs = new Set<string>()
	const tests: TestCase[] = []
	const builders: BuildTask[] = []

	const readyListeners: OnReadyListener[] = []

	const binds: BindEnv[] = []
	const bindListeners: OnEnvListener[] = []

	const allEnv: BindEnv[] = []
	const allEnvListeners: OnEnvListener[] = []
	const allLocalEnv: Record<string, BindEnv[]> = {}
	const allLocalEnvListeners: Record<string, OnEnvListener[]> = {}

	// const all =

	// const allFunctions: aws.lambda.Function[] = []
	// const allFunctionListeners: OnFunctionListener[] = []
	// const allLocalFunctions: Record<string, aws.lambda.Function[]> = {}
	// const allLocalFunctionListeners: Record<string, OnFunctionListener[]> = {}

	const allPolicies: aws.iam.RolePolicy[] = []
	const allPoliciesListeners: OnPolicyListener[] = []
	const allLocalPolicies: Record<string, aws.iam.RolePolicy[]> = {}
	const allLocalPolicyListeners: Record<string, OnPolicyListener[]> = {}

	// const env: EnvStore = {
	// 	bind(name, value) {
	// 		binds.push({ name, value })
	// 	},
	// 	set(name, value) {
	// 		allEnvVars[name] = value
	// 	},
	// 	get(name) {
	// 		return allEnvVars[name]
	// 	},
	// 	all() {
	// 		return allEnvVars
	// 	},
	// }

	// ---------------------------------------------------------------

	// debug('Run plugin onApp listeners')

	for (const feature of features) {
		feature.onApp?.({
			...props,
			app,
			// env,
			base,
			shared,
			onPolicy(callback) {
				allPoliciesListeners.push(callback)
			},
			// onFunction(callback) {
			// 	allFunctionListeners.push(callback)
			// },
			// registerFunction(lambda) {
			// 	allFunctions.push(lambda)
			// },
			registerPolicy(policy) {
				allPolicies.push(policy)
			},
			registerTest(name, paths) {
				tests.push({ name, paths })
			},
			registerBuild(type, name, builder) {
				builders.push({ type, name, builder })
			},
			// registerSiteFunction(lambda) {
			// 	siteFunctions.push(lambda)
			// },
			bind(name, value) {
				binds.push({ name, value })
			},
			onBind(cb) {
				bindListeners.push(cb)
			},
			addEnv(name, value) {
				allEnv.push({ name, value })
			},
			onEnv(cb) {
				allEnvListeners.push(cb)
			},
			onReady(cb) {
				readyListeners.push(cb)
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
		const localPolicyListeners: OnPolicyListener[] = []
		const localPolicies: aws.iam.RolePolicy[] = []
		// const localFunctionListeners: OnFunctionListener[] = []
		// const localFunctions: aws.lambda.Function[] = []
		const localEnvListeners: OnEnvListener[] = []
		const localEnv: BindEnv[] = []

		const stack = new Stack(app, stackConfig.name)

		allLocalPolicyListeners[stack.name] = localPolicyListeners
		allLocalPolicies[stack.name] = localPolicies
		// allLocalFunctionListeners[stack.name] = localFunctionListeners
		// allLocalFunctions[stack.name] = localFunctions
		allLocalEnvListeners[stack.name] = localEnvListeners
		allLocalEnv[stack.name] = localEnv

		for (const feature of features) {
			feature.onStack?.({
				...props,
				stackConfig,
				app,
				// env,
				base,
				stack,
				shared,
				// onFunction(callback) {
				// 	localFunctionListeners.push(callback)
				// },
				// registerFunction(lambda) {
				// 	allFunctions.push(lambda)
				// 	localFunctions.push(lambda)
				// },
				onPolicy(callback) {
					localPolicyListeners.push(callback)
				},
				registerPolicy(policy) {
					allPolicies.push(policy)
					localPolicies.push(policy)
				},
				registerTest(name, paths) {
					tests.push({ name, paths })
				},
				registerBuild(type, name, builder) {
					builders.push({ type, name, builder })
				},
				registerConfig(name) {
					configs.add(name)
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

		for (const listener of localPolicyListeners) {
			for (const policy of localPolicies) {
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

	for (const listener of allPoliciesListeners) {
		for (const fn of allPolicies) {
			listener(fn)
		}
	}

	for (const listener of allEnvListeners) {
		for (const env of allEnv) {
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

	for (const stackConfig of filterdStacks) {
		// const functions = allLocalFunctions[stackConfig.name]!
		const policies = allLocalPolicies[stackConfig.name]!
		const env = allLocalEnv[stackConfig.name]!

		for (const dependency of stackConfig.depends ?? []) {
			// const functionListeners = allLocalFunctionListeners[dependency]!
			const policyListeners = allLocalPolicyListeners[dependency]!
			const envListeners = allLocalEnvListeners[dependency]!

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
		// deploymentLine,
	}
}
