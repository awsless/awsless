import { AnyZodObject, z } from "zod"
import { BaseConfig } from './config.js'
import { Binding } from './stack.js'
import { AppConfigInput } from './schema/app.js'
import { Stack } from './formation/stack.js'
import { App } from './formation/app.js'
import { Resource } from "./formation/resource.js"

export type PluginSchema = AnyZodObject | undefined
export type PluginDepends = Plugin[] | undefined

export type ExtendedConfigOutput<S extends AnyZodObject | undefined = undefined> = (
	S extends AnyZodObject
		? BaseConfig & z.output<S>
		: BaseConfig
)

export type ExtendedConfigInput<S extends AnyZodObject | undefined = undefined> = (
	S extends AnyZodObject
		? AppConfigInput & z.input<S>
		: AppConfigInput
)

export type ResourceContext<S extends AnyZodObject | undefined = undefined> = {
	config: ExtendedConfigOutput<S>
	app: App
	stack: Stack
	bootstrap: Stack
	usEastBootstrap: Stack
	resource: Resource
	// bind: (cb: Binding) => void
}

export type StackContext<S extends AnyZodObject | undefined = undefined> = {
	config: ExtendedConfigOutput<S>
	stack: Stack
	stackConfig: ExtendedConfigOutput<S>['stacks'][number]
	bootstrap: Stack
	usEastBootstrap: Stack
	app: App
	bind: (cb: Binding) => void
}

export type AppContext<S extends AnyZodObject | undefined = undefined> = {
	config: ExtendedConfigOutput<S>
	bootstrap: Stack
	usEastBootstrap: Stack
	app: App
	bind: (cb: Binding) => void
}

export type Plugin<S extends AnyZodObject | undefined = undefined> = {
	name: string
	schema?: S
	// depends?: D
	onApp?: (context: AppContext<S>) => void
	onStack?: (context: StackContext<S>) => void
	onResource?: (context: ResourceContext<S>) => void
}

export const definePlugin = <
	S extends AnyZodObject | undefined = undefined,
>(plugin:Plugin<S>) => plugin
