import { AppConfig, makeApp, toApp } from "../src/app"
import { Tasks } from "../src/util/__task"
import { globalStack } from "../src/stack/global"
import { bootstrapStack, deployBootstrap } from "../src/stack/bootstrap"
import { formatConfig, importConfig } from "../src/config"
import { formatTree } from "../src/util/deployment"
import chalk from "chalk"
import { colors } from "../src/cli/logger"

describe('test', () => {

	it('build', async () => {

		// const tasks = new Tasks()
		// const app = toApp(config, tasks)

		// await tasks.run('build')

		// app.synth()

		// console.log(assembly);
	})

	it('bootstrap', async () => {

		const config = await importConfig({
			configFile: '/test/_data/config.ts',
			verbose: true,
		})

		// console.log(config);

		await deployBootstrap(config)

		const tasks = new Tasks()
		const { app, deploymentTree } = toApp(config, tasks)

		// await tasks.run('build')
		// await tasks.run('publish-asset')

		console.log('')
		console.log(formatConfig(config))

		console.log('')
		console.log(colors.primary('Stacks'))
		console.log('')
		console.log(formatTree(deploymentTree))

		// const assembly = app.synth()

		// console.log(assembly.stacks[]);


		// bootstrapStack(config, app)
		// globalStack(config, app)

		// uploadAsset(assembly.stacks[0])


	}, 20 * 1000)

})
