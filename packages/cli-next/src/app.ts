// import { createDeploymentLine } from './util/deployment.js'
// import { debug } from './cli/logger.js'
// import { style } from './cli/style.js'
import { aws } from '@terraforge/aws'
import { App, Input, Stack } from '@terraforge/core'
import { Builder } from './build/index.js'
import { Command } from './command.js'
import { AppConfig } from './config/app.js'
import { StackConfig } from './config/stack.js'
import { OnEnvListener, OnPermissionCallback, OnReadyListener, Permission } from './feature.js'
import { features } from './feature/index.js'
import { SharedData } from './shared.js'
import { generateGlobalAppId } from './util/name.js'

export type CreateAppProps = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
	deploymentId?: string
	import?: boolean
}

export type Warning = {
	message: string
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
	// app.setTag('app', app.name)

	const zones = new Stack(app, 'zones')
	// zones.setTag('stack', zones.name)

	const base = new Stack(app, 'base')
	// base.setTag('stack', base.name)

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
	const functionsByConfig: Record<string, aws.lambda.Function[]> = {}
	const tests: TestCase[] = []
	const warnings: Warning[] = []
	const builders: BuildTask[] = []
	const domainZones: aws.route53.Zone[] = []

	const readyListeners: OnReadyListener[] = []
	const readyLastListeners: OnReadyListener[] = []

	const binds: BindEnv[] = []
	const bindListeners: OnEnvListener[] = []

	const globalEnv: BindEnv[] = []
	const globalEnvListeners: OnEnvListener[] = []

	const globalPermissions: Permission[] = []
	const globalPermissionCallbacks: OnPermissionCallback[] = []
	const appPermissions: Permission[] = []
	const appPermissionCallbacks: OnPermissionCallback[] = []

	// ---------------------------------------------------------------

	for (const feature of features) {
		feature.onBefore?.({
			...props,
			import: props.import ?? false,
			app,
			appId,
			base,
			zones,
			shared,
			addWarning(props) {
				warnings.push(props)
			},
		})
	}

	// ---------------------------------------------------------------

	for (const feature of features) {
		feature.onApp?.({
			...props,
			import: props.import ?? false,
			app,
			appId,
			base,
			zones,
			shared,
			onPermission(callback) {
				globalPermissionCallbacks.push(callback)
				appPermissionCallbacks.push(callback)
			},
			addGlobalPermission(permission) {
				globalPermissions.push(permission)
			},
			addAppPermission(permission) {
				appPermissions.push(permission)
			},
			addWarning(props) {
				warnings.push(props)
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
			registerDomainZone(zone) {
				domainZones.push(zone)
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
			onReadyLast(cb) {
				readyLastListeners.push(cb)
			},
		})
	}

	// ---------------------------------------------------------------

	for (const stackConfig of props.stackConfigs) {
		const stack = new Stack(app, stackConfig.name)

		for (const feature of features) {
			feature.onStack?.({
				...props,
				import: props.import ?? false,
				stackConfig,
				app,
				appId,
				base,
				zones,
				stack,
				shared,
				onPermission(callback) {
					globalPermissionCallbacks.push(callback)
					appPermissionCallbacks.push(callback)
				},
				addGlobalPermission(permission) {
					globalPermissions.push(permission)
				},
				addAppPermission(permission) {
					appPermissions.push(permission)
				},
				addWarning(props) {
					warnings.push(props)
				},
				addFunction(lambda) {
					for (const configName of stackConfig.configs ?? []) {
						functionsByConfig[configName] ??= []
						functionsByConfig[configName].push(lambda)
					}
				},
				// onGlobalPolicy(callback) {
				// 	globalPoliciesListeners.push(callback)
				// },
				// onAppPolicy(callback) {
				// 	appPoliciesListeners.push(callback)
				// },
				// onStackPolicy(callback) {
				// 	stackPolicyListeners.push(callback)
				// },
				// registerPolicy(policy) {
				// 	globalPolicies.push(policy)
				// 	stackPolicies.push(policy)
				// },
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
				registerDomainZone(zone) {
					domainZones.push(zone)
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
					globalEnv.push({ name, value })
				},
				onEnv(cb) {
					globalEnvListeners.push(cb)
				},
				onReady(cb) {
					readyListeners.push(cb)
				},
				onReadyLast(cb) {
					readyLastListeners.push(cb)
				},
			})
		}
	}

	// ---------------------------------------------------------------
	// Global app binds

	for (const callback of appPermissionCallbacks) {
		for (const permission of appPermissions) {
			callback(permission)
		}
	}

	for (const callback of globalPermissionCallbacks) {
		for (const permission of globalPermissions) {
			callback(permission)
		}
	}

	for (const listener of globalEnvListeners) {
		for (const env of globalEnv) {
			listener(env.name, env.value)
		}
	}

	// ---------------------------------------------------------------
	// Site env binds

	for (const listener of bindListeners) {
		for (const { name, value } of binds) {
			listener(name, value)
		}
	}

	// ---------------------------------------------------------------
	// Ready!

	const ready = () => {
		for (const listener of readyListeners) {
			listener()
		}

		for (const listener of readyLastListeners) {
			listener()
		}
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
		appId,
		base,
		zones,
		ready,
		domainZones,
		tests,
		binds,
		shared,
		configs,
		functionsByConfig,
		warnings,
		builders,
		commands,
		// deploymentLine,
	}
}
