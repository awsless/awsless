import { aws } from '@terraforge/aws'
import { App, Input, Stack } from '@terraforge/core'
import { Builder } from './build/index.js'
import { Command } from './command.js'
import { AppConfig } from './config/app.js'
import { StackConfig } from './config/stack.js'
import { AppContext, BeforeContext, OnReadyListener, Permission, StackContext } from './feature.js'
import { features } from './feature/index.js'
import { SharedData } from './shared.js'
import { generateGlobalAppId } from './util/name.js'

export type CreateAppProps = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
	deploymentId?: string
	import?: boolean

	// The local dev environment builds every function into the bundle,
	// standalone or not - locally there's only the bundle worker.
	dev?: boolean

	// The remote config values, only provided by the deploy command.
	configValues?: Record<string, string>
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

// Values & listeners meet through a channel, so whichever side
// registers later still sees everything.
export const createChannel = <T extends unknown[]>() => {
	const values: T[] = []
	const listeners: ((...value: T) => void)[] = []
	let open = false

	return {
		add: (...value: T) => {
			values.push(value)

			if (open) {
				for (const listener of listeners) {
					listener(...value)
				}
			}
		},
		listen: (listener: (...value: T) => void) => {
			listeners.push(listener)

			if (open) {
				for (const value of values) {
					listener(...value)
				}
			}
		},
		// Delivery only starts once every feature has registered, so
		// listeners see the complete set instead of a piecemeal one.
		open: () => {
			if (open) {
				return
			}

			open = true

			// Snapshots, so a value added during the replay is delivered
			// once through add instead of again by this loop.
			const replay = [...values]

			for (const listener of [...listeners]) {
				for (const value of replay) {
					listener(...value)
				}
			}
		},
	}
}

export const createApp = (props: CreateAppProps) => {
	const app = new App(props.appConfig.name)
	const zones = new Stack(app, 'zones')
	const base = new Stack(app, 'base')

	const shared = new SharedData()
	const appId = generateGlobalAppId({
		accountId: props.accountId,
		region: props.appConfig.region,
		appName: props.appConfig.name,
	})

	const commands: Command[] = []
	const configs = new Set<string>()
	const tests: TestCase[] = []
	const warnings: Warning[] = []
	const builders: BuildTask[] = []
	const domainZones: aws.route53.Zone[] = []
	const binds: BindEnv[] = []

	const readyListeners: OnReadyListener[] = []
	const readyLastListeners: OnReadyListener[] = []

	const permissions = createChannel<[Permission]>()
	const envs = createChannel<[string, Input<string>]>()
	const bindings = createChannel<[string, Input<string>]>()

	// ---------------------------------------------------------------

	const beforeContext: BeforeContext = {
		...props,
		import: props.import ?? false,
		dev: props.dev ?? false,
		app,
		appId,
		base,
		zones,
		shared,
		addWarning(warning) {
			warnings.push(warning)
		},
	}

	const createAppContext = (stack: Stack): AppContext => ({
		...beforeContext,
		onPermission: permissions.listen,
		addPermission: permissions.add,
		registerBuild(type, name, builder) {
			builders.push({ stackName: stack.name, type, name, builder })
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
		bind(name, value) {
			binds.push({ name, value })
			bindings.add(name, value)
		},
		onBind: bindings.listen,
		addEnv: envs.add,
		onEnv: envs.listen,
		onReady(cb) {
			readyListeners.push(cb)
		},
		onReadyLast(cb) {
			readyLastListeners.push(cb)
		},
	})

	const createStackContext = (stackConfig: StackConfig): StackContext => {
		const stack = new Stack(app, stackConfig.name)

		return {
			...createAppContext(stack),
			stackConfig,
			stack,
			registerTest(name, paths) {
				tests.push({ stackName: stack.name, name, paths })
			},
		}
	}

	// ---------------------------------------------------------------

	for (const feature of features) {
		feature.onBefore?.(beforeContext)
	}

	const appContext = createAppContext(base)

	for (const feature of features) {
		feature.onApp?.(appContext)
	}

	for (const stackConfig of props.stackConfigs) {
		const stackContext = createStackContext(stackConfig)

		for (const feature of features) {
			feature.onStack?.(stackContext)
		}
	}

	// ---------------------------------------------------------------
	// Every feature has registered, so the channels can deliver.

	permissions.open()
	envs.open()
	bindings.open()

	// ---------------------------------------------------------------
	// Ready!

	let isReady = false

	// Commands that apply the graph call it after the builds; commands
	// that only hydrate deployed state don't need it.
	const ready = () => {
		if (isReady) {
			throw new Error('The app is already ready.')
		}

		isReady = true

		for (const listener of readyListeners) {
			listener()
		}

		for (const listener of readyLastListeners) {
			listener()
		}
	}

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
		warnings,
		builders,
		commands,
	}
}
