import { App, DefaultStackSynthesizer, Stack } from "aws-cdk-lib"
import { Config } from "./config"
import { toStack } from "./stack"
import { assemblyDir } from "./util/path"
import { globalStack } from "./stack/global"
import { assetBucketName } from "./stack/bootstrap"
import { StackNode, createDependencyTree } from "./util/deployment"
import { debug } from "./cli/logger"
import { style } from "./cli/style"
import { Assets } from "./util/assets"
import { StackConfig } from "./schema/stack"
import { functionPlugin } from "./resource/function"
import { cronPlugin } from "./resource/cron"
import { queuePlugin } from "./resource/queue"
import deepmerge from 'deepmerge'

export const makeApp = (config:Config) => {
	return new App({
		outdir: assemblyDir,
		defaultStackSynthesizer: new DefaultStackSynthesizer({
			fileAssetsBucketName: assetBucketName(config),
			fileAssetPublishingRoleArn: '',
			generateBootstrapVersionRule: false,
		}),
	})
}

const getAllDepends = (filters:StackConfig[]) => {
	const list:StackConfig[] = []
	const walk = (deps:StackConfig[]) => {
		deps.forEach(dep => {
			!list.includes(dep) && list.push(dep)
			dep.depends && walk(dep.depends)
		})
	}

	walk(filters)
	return list
}

export const toApp = async (appConfig:Config, filters:string[]) => {
	const assets = new Assets()
	const app = makeApp(appConfig)
	const stacks:{ stack:Stack, config:StackConfig }[] = []
	const plugins = [
		functionPlugin,
		// cronPlugin,
		// queuePlugin,
		...(appConfig.plugins || [])
	]

	debug('Plugins detected:', plugins.map(plugin => style.info(plugin.name)).join(', '))

	// ---------------------------------------------------------------
	// Validate the plugin schema on our config file

	debug('Run plugin validation schema')

	let config = appConfig
	for(const plugin of plugins) {
		if(plugin.schema) {
			const partialConfig = await plugin.schema.parseAsync(config)
			config = deepmerge(config, partialConfig)
		}
	}

	debug('Merged config', config)

	// ---------------------------------------------------------------
	// Run all onApp listeners for every plugin

	debug('Run plugin onApp listeners')

	plugins.forEach(plugin => plugin.onApp?.({ config, app, assets }))

	// ---------------------------------------------------------------

	debug('Stack filters:', filters.map(filter => style.info(filter)).join(', '))

	const filterdStacks = (
		filters.length === 0
		? config.stacks
		: getAllDepends(
			// config.stacks,
			config.stacks.filter((stack) => filters.includes(stack.name))
		)
	)

	debug('Found stacks:', filterdStacks)

	for(const stackConfig of filterdStacks) {
		// stackConfig.depends = [
		// 	...(sta
		// 	global.config,ckConfig.depends || []),
		// ]

		const { stack } = toStack({
			config,
			stackConfig,
			assets,
			plugins,
			app,
		})

		stacks.push({ stack, config: stackConfig })
	}

	// const deploymentTree = createDeploymentTree(stacks)

	const dependencyTree:StackNode[] = [{
		stack: globalStack(config, app),
		level: 0,
		children: createDependencyTree(stacks)
	}]

	// debug('Stack Tree', deploymentTree[0].children)

	return {
		app,
		assets,
		// stacks: stacks.map(({ stack }) => stack),
		plugins,
		stackNames: filterdStacks.map(stack => stack.name),
		dependencyTree,
		// deploymentTree: createDeploymentTree(stacks)
	}
}
