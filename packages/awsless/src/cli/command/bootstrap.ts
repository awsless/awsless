import { Command } from "commander";
import { bootstrapDeployer } from "../ui/complex/bootstrap";
import { layout } from "../ui/layout/layout";

export const bootstrap = (program: Command) => {
	program
		.command('bootstrap')
		.description('Create the awsless bootstrap stack')
		.action(async () => {
			await layout(async (config, write) => {
				await write(bootstrapDeployer(config))
			})
		})
}
