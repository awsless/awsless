import { App, DefaultStackSynthesizer, Stack } from "aws-cdk-lib"
import { Config } from "./config"
import { toStack } from "./stack"
import { assemblyDir } from "./util/path"
import { appBootstrapStack } from "./stack/app-bootstrap"
import { assetBucketName } from "./stack/bootstrap"
import { StackNode, createDependencyTree } from "./util/deployment"
import { debug } from "./cli/logger"
import { style } from "./cli/style"
import { Assets } from "./util/assets"
import { StackConfig } from "./schema/stack"
import { defaultPlugins } from "./plugins"

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

export const toApp = async (config:Config, filters:string[]) => {
	const assets = new Assets()
	const app = makeApp(config)
	const stacks:{ stack:Stack, config:StackConfig }[] = []
	const plugins = [
		...defaultPlugins,
		...(config.plugins || [])
	]

	debug('Plugins detected:', plugins.map(plugin => style.info(plugin.name)).join(', '))

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

	// debug('Found stacks:', filterdStacks)

	for(const stackConfig of filterdStacks) {
		const { stack } = toStack({
			config,
			stackConfig,
			assets,
			plugins,
			app,
		})

		stacks.push({ stack, config: stackConfig })
	}

	// ---------------------------------------------------------------
	// Make a bootstrap stack if needed and add it to the
	// dependency tree

	let dependencyTree:StackNode[]
	const bootstrap = appBootstrapStack({ config, app, assets })

	if(bootstrap.node.children.length === 0) {
		dependencyTree = createDependencyTree(stacks)
	} else {
		dependencyTree = [{
			stack: bootstrap,
			level: 0,
			children: createDependencyTree(stacks)
		}]
	}

	// dependencyTree = [{
	// 	stack: bootstrap,
	// 	level: 0,
	// 	children: createDependencyTree(stacks)
	// }]

	return {
		app,
		assets,
		plugins,
		stackNames: filterdStacks.map(stack => stack.name),
		dependencyTree,
	}
}
