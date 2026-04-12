import { Binding } from './stack.js'
import { Stack } from './formation/stack.js'
import { App } from './formation/app.js'
import { TypeGen } from './util/type-gen.js'
import { Config } from './config/config.js'
import { StackConfig } from './config/stack.js'

export type StackContext = {
	config: Config
	stack: Stack
	stackConfig: StackConfig
	bootstrap: Stack
	usEastBootstrap: Stack
	tests: Map<string, string[]>
	app: App
	bind: (cb: Binding) => void
}

export type AppContext = {
	config: Config
	bootstrap: Stack
	usEastBootstrap: Stack
	tests: Map<string, string[]>
	app: App
	bind: (cb: Binding) => void
}

export type TypeGenContext = {
	config: Config
	write: (file: string, data?: TypeGen | Buffer | string, include?: boolean) => Promise<void>
}

export type Plugin = {
	name: string
	onApp?: (context: AppContext) => void
	onStack?: (context: StackContext) => void
	onTypeGen?: (context: TypeGenContext) => void | Promise<void>
}

export const definePlugin = (plugin: Plugin) => plugin
