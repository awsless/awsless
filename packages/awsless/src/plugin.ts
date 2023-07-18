import { App, Stack } from "aws-cdk-lib"
import { Assets } from "./util/assets"
import { Schema, z } from "zod"
import { Config } from "./config"
import { Function } from "aws-cdk-lib/aws-lambda"
import { Binding } from "./stack"

export type PluginSchema = Schema | undefined
export type PluginDepends = Plugin[] | undefined

type ExtendedConfig<S extends Schema | undefined = undefined> = (
	S extends Schema
		? Config & z.infer<S>
		: Config
)

export type StackContext<S extends Schema | undefined = undefined> = {
	config: ExtendedConfig<S>
	stack: Stack
	stackConfig: ExtendedConfig<S>['stacks'][number]
	assets: Assets
	app: App
	bind: (cb: Binding) => void
}

export type BootstrapContext<S extends Schema | undefined = undefined> = {
	config: ExtendedConfig<S>
	assets: Assets
}

export type AppContext<S extends Schema | undefined = undefined> = {
	config: ExtendedConfig<S>
	assets: Assets
	app: App
}

export type Plugin<S extends Schema | undefined = undefined> = {
	name: string
	schema?: S
	// depends?: D
	onBootstrap?: (config: BootstrapContext<S>, bootstrap: Stack) => void
	onStack?: (context: StackContext<S>) => Function[]
	onApp?: (config:AppContext<S>) => void
}

export const definePlugin = <
	S extends Schema | undefined = undefined,
>(plugin:Plugin<S>) => plugin
