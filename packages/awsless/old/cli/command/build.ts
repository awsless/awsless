import { Command } from "commander";
import { toApp } from '../../app.js';
import { layout } from '../ui/layout/layout.js';
import { assetBuilder } from "../ui/complex/asset.js";
import { cleanUp } from "../../util/cleanup.js";

export const build = (program: Command) => {
	program
		.command('build')
		.argument('[stack...]', 'Optionally filter stacks to build')
		.description('Build your app')
		.action(async (filters: string[]) => {
			await layout(async (config, write) => {

				const { app, assets } = await toApp(config, filters)

				await cleanUp()
				await write(assetBuilder(assets))

				app.synth()
			})
		})
}
