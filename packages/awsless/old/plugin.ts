import { App, Stack } from "aws-cdk-lib"
import { Assets } from './util/assets.js'
import { AnyZodObject, z } from "zod"
import { BaseConfig } from './config.js'
import { Function } from "aws-cdk-lib/aws-lambda"
import { Binding } from './stack.js'
import { AppConfigInput } from './schema/app.js'

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

export type StackContext<S extends AnyZodObject | undefined = undefined> = {
	config: ExtendedConfigOutput<S>
	stack: Stack
	stackConfig: ExtendedConfigOutput<S>['stacks'][number]
	assets: Assets
	app: App
	bind: (cb: Binding) => void
}

export type BootstrapContext<S extends AnyZodObject | undefined = undefined> = {
	config: ExtendedConfigOutput<S>
	assets: Assets
	stack: Stack
	usEastStack: Stack
	app: App
}

export type AppContext<S extends AnyZodObject | undefined = undefined> = {
	config: ExtendedConfigOutput<S>
	assets: Assets
	app: App
}

export type Plugin<S extends AnyZodObject | undefined = undefined> = {
	name: string
	schema?: S
	// depends?: D
	// onAssets?: (context: BootstrapContext<S>) => Promise<void> | void
	onBootstrap?: (context: BootstrapContext<S>) => Function[] | void
	onStack?: (context: StackContext<S>) => Function[] | void
	onApp?: (context:AppContext<S>) => void
}

export const definePlugin = <
	S extends AnyZodObject | undefined = undefined,
>(plugin:Plugin<S>) => plugin
