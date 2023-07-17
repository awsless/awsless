
import { Command } from "commander";
import { Params } from "../../../util/param";
import { list } from "../../ui/layout/list";
import { dialog, loadingDialog } from "../../ui/layout/dialog";
import { br } from "../../ui/layout/basic";
import { style } from "../../style";
import { layout } from "../../ui/layout/layout";
import { confirmPrompt } from "../../ui/prompt/confirm";
import { Cancelled } from "../../error";

export const del = (program: Command) => {
	program
		.command('delete <name>')
		.description('Delete a config value')
		.action(async (name: string) => {
			await layout(async (config, write) => {
				const params = new Params(config)

				write(dialog('warning', [`Your deleting the ${style.info(name)} config parameter`]))
				const confirm = await write(confirmPrompt('Are you sure?'))

				if(!confirm) {
					throw new Cancelled()
				}

				const done = write(loadingDialog(`Deleting remote config parameter`))

				const value = await params.get(name)
				await params.delete(name)

				done(`Done deleting remote config parameter`)

				write(br())
				write(list({
					Name: name,
					Value: value || style.error('(empty)'),
				}))
			})
		})
}
