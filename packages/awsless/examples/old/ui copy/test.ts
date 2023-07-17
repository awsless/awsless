import { Command } from "commander";
import { textPrompt } from "../../../src/cli/ui/prompt/text";
import { passwordPrompt } from "../../../src/cli/ui/prompt/password";
import { confirmPrompt } from "../../../src/cli/ui/prompt/confirm";
import { loadingDialog } from "../../../src/cli/ui/layout/dialog";
import { layout } from "../../../src/cli/ui/layout/layout";

export const test = (program: Command) => {
	program
		.command('test')
		.description('Test')
		.action(async () => {
			await layout(async (config, write, term) => {
				const stop = write(loadingDialog('How fast are you?'))

				await write(confirmPrompt('Want to login?'))
				await write(textPrompt('Enter username'))
				await write(passwordPrompt('Enter password'))

				stop('Done')
			})
		})
}
