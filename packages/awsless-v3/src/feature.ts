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
	registerConfig: RegisterConfig

	// onStackPolicy: OnPolicy
	addStackPermission: OnPermissionCallback

	addFunction: (lambda: aws.lambda.Function) => void
}

export type BeforeContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string
	appId: string
	import: boolean

	app: App
	base: Stack
	zones: Stack
	shared: SharedData

	addWarning(warning: Warning): void
}

export type AppContext = BeforeContext & {
	// registerTest: RegisterTest
	registerBuild: RegisterBuild
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
	addAppPermission: OnPermissionCallback
	addGlobalPermission: OnPermissionCallback

	// onEnv: (envVars: Record<string, Input<string>>) => void
}

export type TypeGenContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]

	write: (file: string, data?: TypeFile | Buffer | string, include?: boolean) => Promise<void>
}

export type Feature = {
	name: string
	onBefore?: (context: BeforeContext) => void
	onApp?: (context: AppContext) => void
	onStack?: (context: StackContext) => void
	onTypeGen?: (context: TypeGenContext) => void | Promise<void>
	onValidate?: (context: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => void
}

export const defineFeature = (feature: Feature): Feature => feature
