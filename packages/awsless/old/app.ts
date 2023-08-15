import { App, DefaultStackSynthesizer, Stack } from "aws-cdk-lib"
import { Config } from './config.js'
import { toStack } from './stack.js'
import { assemblyDir } from './util/path.js'
import { appBootstrapStack } from './stack/app-bootstrap.js'
import { assetBucketName } from './stack/bootstrap.js'
import { StackNode, createDependencyTree } from './util/deployment.js'
import { debug } from './cli/logger.js'
import { style } from './cli/style.js'
import { Assets } from './util/assets.js'
import { StackConfig } from './schema/stack.js'
import { defaultPlugins } from './plugins/index.js'
import { customResources } from "./custom-resource/index.js"

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

	const bootstrap = appBootstrapStack({ config, app, assets })

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

	for(const stackConfig of filterdStacks) {
		const { stack, bindings } = toStack({
			config,
			stackConfig,
			assets,
			plugins,
			app,
		})

		stacks.push({ stack, config: stackConfig })

		// ---------------------------------------------------------------
		// Link all stack resources to our bootstrap lambda function's

		bindings.forEach(cb => bootstrap.functions.forEach(cb))
	}

	// ---------------------------------------------------------------

	const constructs = app.node.findAll()
	const created:unknown[] = []

	for(const construct of constructs) {
		for(const resource of customResources) {
			if(construct instanceof resource && !created.includes(resource)) {
				created.push(resource)
				resource.create(bootstrap.stack)
			}
		}
	}

	// ---------------------------------------------------------------
	// Make a bootstrap stack if needed and add it to the
	// dependency tree

	let dependencyTree:StackNode[] = createDependencyTree(stacks)

	if(bootstrap.stack.node.children.length > 0) {
		dependencyTree = [{
			stack: bootstrap.stack,
			children: dependencyTree,
		}]
	}

	if(bootstrap.usEastStack.node.children.length > 0) {
		dependencyTree = [{
			stack: bootstrap.usEastStack,
			children: dependencyTree,
		}]
	}

	return {
		app,
		assets,
		plugins,
		stackNames: filterdStacks.map(stack => stack.name),
		dependencyTree,
	}
}
