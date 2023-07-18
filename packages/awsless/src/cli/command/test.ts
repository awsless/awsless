import { Command } from "commander";
import { layout } from "../ui/layout/layout";

export const test = (program: Command) => {
	program
		.command('test')
		.description('Test')
		.action(async () => {
			await layout(async (config, write) => {

			})
		})
}
