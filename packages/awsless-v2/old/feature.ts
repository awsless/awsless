import { TypeGen } from './util/type-gen.js'
import { Config } from './config/config.js'
import { StackConfig } from './config/stack.js'

import { Stack, aws } from '@awsless/formation'
import { AppConfig } from './config/app.js'

// (lambda: Function) => void

export type StackContext = {
	appConfig: AppConfig
	stackConfig: StackConfig

	base: Stack
	stack: Stack

	registerTest: (name: string, path: string) => void
	registerBuild: (name: string, cb: (task) => Promise<void>) => void
	registerFunction: (func: typeof aws.lambda.Function) => void

	onFunction: (cb: (func: typeof aws.lambda.Function) => void) => void
}

export type AppContext = {
	appConfig: AppConfig
	base: Stack

	registerBuild: (name: string, cb: (task) => Promise<void>) => void
	registerFunction: (func: typeof aws.lambda.Function) => void

	onFunction: (cb: (func: typeof aws.lambda.Function) => void) => void

	// config: Config
	// bootstrap: Stack
	// usEastBootstrap: Stack
	// tests: Map<string, string[]>
	// app: App
	// bind: (cb: Binding) => void
}

export type TypeGenContext = {
	appConfig: AppConfig
	write: (file: string, data?: TypeGen | Buffer | string, include?: boolean) => Promise<void>
}

export type Feature = {
	name: string
	onApp?: (context: AppContext) => void
	onStack?: (context: StackContext) => void
	onTypeGen?: (context: TypeGenContext) => void | Promise<void>
}

export const defineFeature = (feature: Feature) => feature
