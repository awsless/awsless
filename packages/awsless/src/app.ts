import { App, DefaultStackSynthesizer, Stack } from "aws-cdk-lib"
import { Config } from "./config"
import { StackConfig, toStack } from "./stack"
import { assemblyDir } from "./util/path"
import { globalStack } from "./stack/global"
import { assetBucketName } from "./stack/bootstrap"
import { Region } from "./util/region"
import { FunctionDefaults } from "./__resource/function"
import { QueueDefaults } from "./__resource/queue"
import { TableDefaults, TableFields } from "./__resource/table"
import { StackNode, createDependencyTree } from "./util/deployment"
import { debug } from "./cli/logger"
import { style } from "./cli/style"
import { Assets } from "./util/assets"

export type Defaults = {
	function?: FunctionDefaults
	queue?: QueueDefaults
	table?: TableDefaults<TableFields>
}

export type AppConfig = {
	name: string
	region: Region
	profile: string
	stage?: string
	defaults?: Defaults
	stacks: StackConfig[]
}

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

export const toApp = (config:Config, filters:string[]) => {
	const assets = new Assets()
	const app = makeApp(config)
	// const global = {
	// 	config: { name: 'global' },
	// 	stack: globalStack(config, app),
	// }

	const stacks:{ stack:Stack, config:StackConfig }[] = []

	// const global = globalStack(config, app)

	debug('Stack filters:', filters.map(filter => style.info(filter)).join(', '))

	const filterdStacks = (
		filters.length === 0
		? config.stacks
		: getAllDepends(
			// config.stacks,
			config.stacks.filter((stack) => filters.includes(stack.name))
		)
	)

	// debug('Stack filters', filterdStacks)

	for(const stackConfig of filterdStacks) {
		// stackConfig.depends = [
		// 	...(sta
		// 	global.config,ckConfig.depends || []),
		// ]

		const { stack } = toStack(config, app, assets, stackConfig)
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
		stackNames: filterdStacks.map(stack => stack.name),
		dependencyTree,
		// deploymentTree: createDeploymentTree(stacks)
	}
}
