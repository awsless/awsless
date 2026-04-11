import { Command } from 'commander'
import { toApp } from '../../app.js'
import { layout } from '../ui/layout/layout.js'
import { assetBuilder } from '../ui/complex/builder.js'
import { cleanUp } from '../../util/cleanup.js'
import { templateBuilder } from '../ui/complex/template.js'
import { typesGenerator } from '../ui/complex/types.js'

export const build = (program: Command) => {
	program
		.command('build')
		.argument('[stack...]', 'Optionally filter stacks to build')
		.description('Build your app assets')
		.action(async (filters: string[]) => {
			await layout(async (config, write) => {
				const { app } = await toApp(config, filters)

				await cleanUp()
				await write(typesGenerator(config))
				await write(assetBuilder(app))
				await write(templateBuilder(app))
			})
		})
}
