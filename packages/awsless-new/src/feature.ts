import { App, aws, Input, Stack } from '@awsless/formation'
import { Builder } from './build/index.js'
import { AppConfig } from './config/app.js'
import { StackConfig } from './config/stack.js'
import { SharedData } from './shared.js'
import { TypeFile } from './type-gen/file.js'

type RegisterPolicy = (policy: aws.iam.RolePolicy) => void
type RegisterFunction = (lambda: aws.lambda.Function) => void
type RegisterSiteFunction = (lambda: aws.lambda.Function) => void

type RegisterBuild = (
	//
	type: string,
	name: string,
	builder: Builder
) => void

type RegisterConfig = (name: string) => void

type RegisterTest = (name: string, paths: string[]) => void
type BindEnv = (name: string, value: Input<string>) => void

export type OnFunction = (callback: OnFunctionListener) => void
export type OnFunctionListener = (lambda: aws.lambda.Function) => void

export type OnPolicy = (callback: OnPolicyListener) => void
export type OnPolicyListener = (policy: aws.iam.RolePolicy) => void

export type StackContext = AppContext & {
	stackConfig: StackConfig
	stack: Stack

	registerConfig: RegisterConfig
}

export type AppContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	accountId: string

	app: App
	base: Stack
	shared: SharedData

	registerTest: RegisterTest
	registerBuild: RegisterBuild
	registerPolicy: RegisterPolicy
	registerFunction: RegisterFunction
	registerSiteFunction: RegisterSiteFunction

	// env: {
	// 	bind: (name: string, value: Input<string>) => void
	// 	set: (name: string, value: Input<string>) => void
	// 	list(): Record<string, Input<string>>
	// }

	bindEnv: BindEnv

	// setEnv:
	// listEnvs:

	onFunction: OnFunction
	onPolicy: OnPolicy
}

export type TypeGenContext = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]

	write: (file: string, data?: TypeFile | Buffer | string, include?: boolean) => Promise<void>
}

export type Feature = {
	name: string
	onApp?: (context: AppContext) => void
	onStack?: (context: StackContext) => void
	onTypeGen?: (context: TypeGenContext) => void | Promise<void>
}

export const defineFeature = (feature: Feature) => feature
