import { aws } from '@terraforge/aws'
import { App, Input, Stack } from '@terraforge/core'
import { Warning } from './app.js'
import { Builder } from './build/index.js'
import { Command } from './command.js'
import { AppConfig } from './config/app.js'
import { StackConfig } from './config/stack.js'
import { SharedData } from './shared.js'
import { TypeFile } from './type-gen/file.js'

// type RegisterPolicy = (policy: aws.iam.RolePolicy) => void
// type RegisterFunction = (lambda: aws.lambda.Function) => void
// type RegisterSiteFunction = (lambda: aws.lambda.Function) => void
type RegisterCommand = (command: Command) => void

type RegisterBuild = (
	//
	type: string,
	name: string,
	builder: Builder
) => void

type RegisterConfig = (name: string) => void

type RegisterTest = (name: string, paths: string[]) => void
// type BindEnv = (name: string, value: Input<string>) => void

// export type EnvStore = {
// 	bind: (name: string, value: Input<string>) => void

// 	set: (name: string, value: Input<string>) => void
// 	get: (name: string) => Input<string> | undefined
// 	all(): Record<string, Input<string>>
// }

export type AddEnv = (name: string, value: Input<string>) => void
export type OnEnv = (cb: OnEnvListener) => void
export type OnEnvListener = (name: string, value: Input<string>) => void

// export type OnFunction = (callback: OnFunctionListener) => void
// export type OnFunctionListener = (lambda: aws.lambda.Function) => void

// const lol: Statement = {
// 	Effect: 'Allow',
// 	""
// 	'Condition': {
// 		'Statement': {

// 		}
// 	}
// }

export type Permission = {
	effect?: 'allow' | 'deny'
	actions: string[]
	resources: Input<Input<string>[]>
	conditions?: unknown
}

export type OnPermission = (callback: OnPermissionCallback) => void
export type OnPermissionCallback = (statement: Permission) => void

// export type OnPolicy = (callback: OnPolicyListener) => void
// export type OnPolicyListener = (policy: aws.iam.RolePolicy) => void

// export type Event = 'after-build' | 'before-build' | 'ready'

// export type OnEvent = (event: Event, callback)

export type OnReady = (callback: OnReadyListener) => void
export type OnReadyListener = () => void

export type StackContext = AppContext & {
	stackConfig: StackConfig
	stack: Stack

	registerTest: RegisterTest
}

export type BeforeContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
	appId: string
	deploymentId?: string
	import: boolean

	// The synth runs for the local dev environment: every function
	// builds into the bundle, standalone or not.
	dev: boolean

	// The remote config values, only provided by the deploy command.
	configValues?: Record<string, string>

	app: App
	base: Stack
	zones: Stack
	shared: SharedData

	addWarning(warning: Warning): void
}

export type AppContext = BeforeContext & {
	// registerTest: RegisterTest
	registerBuild: RegisterBuild
	registerConfig: RegisterConfig
	registerCommand: RegisterCommand
	registerDomainZone: (zone: aws.route53.Zone) => void

	// registerPolicy: RegisterPolicy
	// registerFunction: RegisterFunction
	// registerSiteFunction: RegisterSiteFunction

	// env: EnvStore

	bind: AddEnv
	onBind: OnEnv

	addEnv: AddEnv
	onEnv: OnEnv

	onReady: OnReady
	onReadyLast: OnReady

	// onEvent: OnEvent

	// bindEnv: BindEnv
	// setEnv:
	// listEnvs:

	// onFunction: OnFunction
	// onGlobalPolicy: OnPolicy
	// onAppPolicy: OnPolicy

	// onGlobalPermission: OnPermission
	// onAppPermission: OnPermission

	onPermission: OnPermission
	addPermission: OnPermissionCallback

	// onEnv: (envVars: Record<string, Input<string>>) => void
}

export type TypeGenContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]

	write: (file: string, data?: TypeFile | Buffer | string, include?: boolean) => Promise<void>
}

// The local dev server (`awsless dev`) dispatches an event into the
// running bundle worker & resolves with the handler result.
export type DevDispatch = (event: unknown) => Promise<unknown>

// A failed async consumer dispatch. There are no retries locally: the
// failure routes to the app's on-failure consumer when one is set.
export type DevFailureReport = {
	kind: 'queue' | 'stream' | 'async'
	// The bundle route of the failed consumer, when known.
	routeKey?: string
	event: unknown
	error: unknown
	queue?: { name: string; url?: string }
}

export type DevReportFailure = (report: DevFailureReport) => void

export type DevRoute = {
	routerId: string
	pattern: string

	// The pattern is already a raw route store key (like the dotted
	// asset wildcard "/_app/*." of a site), so the local router uses it
	// verbatim instead of compiling it.
	rawKey?: boolean

	// Dispatch matching requests into the bundle under this route key.
	routeKey?: string

	// Proxy matching requests (including websocket upgrades) to another
	// local server instead of the bundle, like the url origins of the
	// deployed router.
	proxy?: string

	// Rewrite the request path before it reaches the handler, like the
	// deployed router does at the origin request.
	rewrite?: {
		regex: string
		to: string
	}
}

// A resource entry for the local dev dashboard: what exists in the
// app & how to poke it. Resources with a routeKey can be invoked from
// the dashboard by dispatching their envelope into the bundle.
export type DevResource = {
	kind:
		| 'function'
		| 'cron'
		| 'queue'
		| 'topic'
		| 'subscriber'
		| 'table'
		| 'store'
		| 'config'
		| 'email'
		| 'task'
		| 'search'
		| 'cache'
		| 'pubsub'
		| 'image'
		| 'icon'
		| 'rpc'
		| 'rest'
		| 'site'
		| 'auth'
		| 'worker'
	id: string
	stack?: string
	routeKey?: string
	// A pre-filled example payload for the dashboard invoke panel.
	envelope?: unknown
	// Extra display info, like a cron schedule or a physical table name.
	detail?: string
	// The declared rpc query names, for the dashboard's rpc call panel.
	queries?: string[]
	// The live event channel of the resource, streamed to a log view on
	// the dashboard panel - like the dev server output of a site.
	channel?: string
}

export type DevServer = {
	name: string
	// Starts before the bundle worker boots, so local resource servers
	// are reachable during the worker module init. The dispatch only
	// becomes callable once the worker is up, so drivers must only use
	// it in reaction to traffic or timers, never during start.
	start: (props: {
		dispatch: DevDispatch
		log: (message: string) => void
		reportFailure: DevReportFailure
		// The full local bundle environment, for servers that spawn
		// child processes needing the local aws endpoints.
		env: Record<string, string>
	}) => void | Promise<void>
	stop?: () => void | Promise<void>
}

export type DevContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	appId: string

	// The local port of the given router. Every router runs as its own
	// local server, like every router is its own domain in production.
	routerPort: (id: string) => number

	// Keep a heavy local server alive across dev environment restarts.
	// It only reboots when the fingerprint changes & stops when its
	// resource disappears from the config.
	keep: <T>(
		key: string,
		fingerprint: unknown,
		boot: () => Promise<{ value: T; stop: () => void | Promise<void> }>
	) => Promise<T>

	// Mark a pooled server as still in use, for servers that only boot
	// later during the start phase.
	retain: (key: string) => void

	// The running value of a pooled server from a previous run.
	peek: <T>(key: string) => T | undefined

	// The shared local dynamodb server, booted on first use & kept
	// across restarts - tables & their data survive config changes.
	useDynamo: () => Promise<{
		server: import('@awsless/dynamodb-server').DynamoDBServer
		// The applied table fingerprints, so restarts only recreate
		// tables whose config changed.
		tableFingerprints: Map<string, string>
	}>

	// The shared local s3 store server, booted on first use - features
	// push their bucket notification rules into the returned array.
	useStore: () => Promise<{ rules: import('./dev/servers/s3.js').StoreNotificationRule[] }>

	// Inject an env var into the local bundle environment.
	addEnv: (name: string, value: string) => void

	// Register an HTTP route on the local router, so requests matching
	// the pattern dispatch into the bundle under the given route key.
	addRoute: (route: DevRoute) => void

	// Register a local resource server or event driver that lives for
	// the duration of the dev session, like a database server, queue
	// poller, or cron scheduler.
	registerServer: (server: DevServer) => void

	// Restart the bundle worker when one of the given files changes,
	// for values the worker only reads during module init.
	restartOnChange: (path: string) => void

	// List a resource on the local dev dashboard.
	registerResource: (resource: DevResource) => void

	// Log a progress message while the dev environment boots, for slow
	// hook work like downloading a local database.
	log: (message: string) => void

	// Emit a live event on a channel, streamed to the dev dashboard.
	emitEvent: (channel: string, data: unknown) => void
}

export type Feature = {
	name: string
	onBefore?: (context: BeforeContext) => void
	onApp?: (context: AppContext) => void
	onStack?: (context: StackContext) => void
	onTypeGen?: (context: TypeGenContext) => void | Promise<void>
	onValidate?: (context: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => void
	onDev?: (context: DevContext) => void | Promise<void>
}

export const defineFeature = (feature: Feature): Feature => feature
