import { Command } from "commander";
import { layout } from '../ui/layout/layout.js';
import { cleanUp } from '../../util/cleanup.js';
import { typesGenerator } from '../ui/complex/types.js';

export const types = (program: Command) => {
	program
		.command('types')
		.description('Generate type definition files')
		.action(async () => {
			await layout(async (config, write) => {
				await cleanUp()
				await write(typesGenerator(config))
			})
		})
}
