import { App, Stack } from "aws-cdk-lib"
import { Assets } from "./util/assets"
import { AnyZodObject, z } from "zod"
import { BaseConfig } from "./config"
import { Function } from "aws-cdk-lib/aws-lambda"
import { Binding } from "./stack"
import { AppConfigInput } from "./schema/app"

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
	onBootstrap?: (config: BootstrapContext<S>) => void
	onStack?: (context: StackContext<S>) => Function[] | void
	onApp?: (config:AppContext<S>) => void
}

export const definePlugin = <
	S extends AnyZodObject | undefined = undefined,
>(plugin:Plugin<S>) => plugin
