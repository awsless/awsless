import { App, Fn, Stack } from "aws-cdk-lib"
import { Config } from "./config"
import { Function } from "aws-cdk-lib/aws-lambda"
import { toFunction, FunctionConfig } from "./__resource/function"
import { QueueConfig, toQueue } from "./__resource/queue"
import { TopicConfig, toTopic } from "./__resource/topic"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { CronConfig, toCron } from "./__resource/cron"
import { TableConfig, TableFields, toTable } from "./__resource/table"
import { toStore } from "./__resource/store"
import { configParameterPrefix } from "./util/param"
import { Assets } from "./util/assets"

export type StackConfig = {
	name: string
	depends?: Array<StackConfig>
	plugins?: Array<(context:Context) => void>

	// resources
	functions?: Record<string, FunctionConfig>
	queues?: Record<string, QueueConfig>
	topics?: Record<string, TopicConfig>
	tables?: Record<string, TableConfig<TableFields>>
	stores?: string[]
	crons?: Record<string, CronConfig>
}

export type Context = {
	config: Config
	assets: Assets
	app: App
	stack: Stack
	stackConfig: StackConfig
}

export const toStack = (config: Config, app: App, assets:Assets, props:StackConfig) => {
	const stackName = `${config.name}-${props.name}`
	const stack = new Stack(app, props.name, {
		stackName,
		tags: {
			APP: config.name,
			STACK: props.name,
		},
	})

	stack.node.children

	const context: Context = { config, assets, app, stack, stackConfig: props }
	const functions: Function[] = []
	const binds: Array<(lambda: Function) => void> = []

	// ------------------------------------------------------
	// Create all available resources
	// ------------------------------------------------------

	// ------------------------------------------------------
	// functions

	for(const [ name, entry ] of Object.entries(props.functions || {})) {
		const { lambda, bind } = toFunction(context, name, entry)
		functions.push(lambda)
		binds.push(bind)
	}

	// ------------------------------------------------------
	// topics

	for(const [ name, entry ] of Object.entries(props.topics || {})) {
		const { lambda } = toTopic(context, name, entry)
		functions.push(lambda)
	}

	// ------------------------------------------------------
	// queues

	for(const [ name, entry ] of Object.entries(props.queues || {})) {
		const { lambda, bind } = toQueue(context, name, entry)
		functions.push(lambda)
		binds.push(bind)
	}

	// ------------------------------------------------------
	// tables

	for(const [ name, entry ] of Object.entries(props.tables || {})) {
		const { bind } = toTable(context, name, entry)
		binds.push(bind)
	}

	// ------------------------------------------------------
	// stores

	for(const name of props.stores || []) {
		const { bind } = toStore(context, name)
		binds.push(bind)
	}

	// ------------------------------------------------------
	// crons

	for(const [ name, entry ] of Object.entries(props.crons || {})) {
		const { lambda } = toCron(context, name, entry)
		functions.push(lambda)
	}

	// ------------------------------------------------------
	// Grant access to all lambda functions
	// ------------------------------------------------------

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

	// ------------------------------------------------------
	// Bind all lambda functions to our resources

	binds.forEach(bind => functions.forEach(lambda => bind(lambda)))

	return {
		stack,
		depends: props.depends,
	}
}
