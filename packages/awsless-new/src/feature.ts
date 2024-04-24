import { Stack, App, aws } from '@awsless/formation'
import { StackConfig } from './config/stack.js'
import { AppConfig } from './config/app.js'
import { Builder } from './build/index.js'
import { TypeFile } from './type-gen/file.js'
import { SharedData } from './shared.js'

type RegisterFunction = (
	//
	lambda: aws.lambda.Function,
	policy: aws.iam.RolePolicy
) => void

type RegisterBuild = (
	//
	type: string,
	name: string,
	builder: Builder
) => void

type RegisterTest = (name: string, paths: string[]) => void

export type OnFunction = (callback: OnFunctionListener) => void
export type OnFunctionListener = (entry: OnFunctionEntry) => void
export type OnFunctionEntry = {
	lambda: aws.lambda.Function
	policy: aws.iam.RolePolicy
}

export type StackContext = AppContext & {
	stackConfig: StackConfig
	stack: Stack
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
	registerFunction: RegisterFunction

	onFunction: OnFunction
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
