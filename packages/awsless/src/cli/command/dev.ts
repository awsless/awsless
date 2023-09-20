import { Command } from "commander";
import { layout } from '../ui/layout/layout.js';
import { cleanUp } from "../../util/cleanup.js";
import { typesGenerator } from "../ui/complex/types.js";
import { watchConfig } from "../../config.js";
import { ProgramOptions } from "../program.js";

export const dev = (program: Command) => {
	program
		.command('dev')
		.description('Start the development service')
		.action(async () => {
			await layout(async (_, write) => {

				const options = program.optsWithGlobals() as ProgramOptions

				for await(const config of watchConfig(options)) {
					await cleanUp()
					await write(typesGenerator(config))
				}
			})
		})
}
