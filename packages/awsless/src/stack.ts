import { App, Arn, Stack } from "aws-cdk-lib"
import { Config } from './config.js'
import { Function } from "aws-cdk-lib/aws-lambda"
import { PolicyStatement } from "aws-cdk-lib/aws-iam"
import { configParameterPrefix } from './util/param.js'
import { Assets } from './util/assets.js'
import { StackConfigOutput } from './schema/stack.js'
import { Plugin } from './plugin.js'
import { AnyZodObject } from "zod"
import { debug } from './cli/logger.js'
import { style } from './cli/style.js'

export type Binding = (lambda:Function) => void

type Context = {
	config: Config
	assets: Assets
	app: App
	stackConfig: StackConfigOutput
	plugins: Plugin<AnyZodObject | undefined>[]
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

	debug('Run plugin onStack listeners')
	const functions = plugins.map(plugin => plugin.onStack?.({
		config,
		assets,
		app,
		stack,
		stackConfig,
		bind,
	})).filter(Boolean).flat().filter(Boolean) as Function[]

	// ------------------------------------------------------
	// Check if stack has resources

	if(stack.node.children.length === 0) {
		throw new Error(`Stack ${style.info(stackConfig.name)} has no resources defined`)
	}

	// debug('STACK STUFF', stackConfig.name, stack.node.children.length)

	// ------------------------------------------------------
	// Grant access to all stack lambda functions
	// ------------------------------------------------------

	bindings.forEach(cb => functions.forEach(cb))

	// ------------------------------------------------------
	// Give app/stage access to all config parameters

	const allowConfigParameters = new PolicyStatement({
		actions: [
			'ssm:GetParameter',
			'ssm:GetParameters',
			'ssm:GetParametersByPath',
		],
		resources: [
			Arn.format({
				region: config.region,
				account: config.account,
				partition: 'aws',
				service: 'ssm',
				resource: 'parameter',
				resourceName: configParameterPrefix(config),
			}),
			// Fn.sub('arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter' + configParameterPrefix(config)),
		],
	})

	functions.forEach(lambda => lambda.addToRolePolicy(allowConfigParameters))

	return {
		stack,
		functions,
		bindings,
		depends: stackConfig.depends,
	}
}
