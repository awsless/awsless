import { Command } from "commander";
import { Params } from "../../../util/param";
import { dialog, loadingDialog } from "../../ui/layout/dialog";
import { list } from "../../ui/layout/list";
import { br } from "../../ui/layout/basic";
import { textPrompt } from "../../ui/prompt/text";
import { style } from "../../style";
import { layout } from "../../ui/layout/layout";

export const set = (program: Command) => {
	program
		.command('set <name>')
		.description('Set a config value')
		// .option('-e --encrypt', 'Encrypt the config value')
		.action(async (name: string) => {
			await layout(async (config, write) => {
				const params = new Params(config)

				write(list({
					'Set config parameter': style.info(name),
				}))

				write(br())

				const value = await write(textPrompt('Enter config value'))

				if(value === '') {
					write(dialog('error', [`Provided config value can't be empty`]))
				} else {
					const done = write(loadingDialog(`Saving remote config parameter`))

					await params.set(name, value)

					done(`Done saving remote config parameter`)
				}
			})
		})
}
