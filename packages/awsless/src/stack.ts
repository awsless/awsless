import { App, Fn, Stack } from "aws-cdk-lib"
import { Config } from "./config"
import { Function } from "aws-cdk-lib/aws-lambda"
// import { toFunction, FunctionConfig } from "./__resource/function"
// import { QueueConfig, toQueue } from "./__resource/queue"
// import { TopicConfig, toTopic } from "./__resource/topic"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
// import { CronConfig, toCron } from "./__resource/cron"
// import { TableConfig, TableFields, toTable } from "./__resource/table"
// import { toStore } from "./__resource/store"
import { configParameterPrefix } from "./util/param"
import { Assets } from "./util/assets"
import { StackConfig } from "./schema/stack"
import { Plugin } from "./plugin"
import { Schema } from "zod"
import { debug } from "./cli/logger"
import { style } from "./cli/style"

// export type StackConfig = {
// 	name: string
// 	depends?: Array<StackConfig>
// 	// plugins?: Array<(context:Context) => void>

// 	// resources
// 	// functions?: Record<string, FunctionConfig>
// 	// queues?: Record<string, QueueConfig>
// 	// topics?: Record<string, TopicConfig>
// 	// tables?: Record<string, TableConfig<TableFields>>
// 	// stores?: string[]
// 	// crons?: Record<string, CronConfig>
// }

export type Binding = (lambda:Function) => void

type Context = {
	config: Config
	assets: Assets
	app: App
	stackConfig: StackConfig
	plugins: Plugin<Schema | undefined>[]
}

export const toStack = ({ config, assets, app, stackConfig, plugins }: Context) => {
	const stackName = `${config.name}-${stackConfig.name}`
	const stack = new Stack(app, stackConfig.name, {
		stackName,
		tags: {
			APP: config.name,
			STAGE: config.stage,
			STACK: stackConfig.name,
		},
	})

	debug('Define stack:', style.info(stackConfig.name))

	// ------------------------------------------------------
	// Create all available resources from all plugins
	// ------------------------------------------------------

	const bindings:Array<(lambda:Function) => void> = []
	const bind = (cb:Binding) => {
		bindings.push(cb)
	}

	const functions = plugins.map(plugin => plugin.onStack?.({
		config,
		assets,
		app,
		stack,
		stackConfig,
		bind,
	})).flat().filter(lambda => !!lambda) as Function[]

	// ------------------------------------------------------
	// Grant access to all lambda functions
	// ------------------------------------------------------

	bindings.forEach(cb => functions.forEach(cb))

	// ------------------------------------------------------
	// Give global access to all sns topics

	const allowTopicPublish = new PolicyStatement({
		actions: [ 'sns:publish' ],
		resources: [ '*' ],
	})

	functions.forEach(lambda => lambda.addToRolePolicy(allowTopicPublish))

	// ------------------------------------------------------
	// Give app/stage access to all config parameters

	const allowConfigParameters = new PolicyStatement({
		actions: [
			'ssm:GetParameter',
			'ssm:GetParameters',
			'ssm:GetParametersByPath',
		],
		resources: [
			Fn.sub('arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter' + configParameterPrefix(config)),
		],
	})

	functions.forEach(lambda => lambda.addToRolePolicy(allowConfigParameters))

	return {
		stack,
		depends: stackConfig.depends,
	}
}
