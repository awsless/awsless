import { Command } from "commander";
import { Params } from "../../../util/param";
import { dialog, loadingDialog } from "../../ui/layout/dialog";
import { list as listUI } from "../../ui/layout/list";
import { br } from "../../ui/layout/basic";
import { layout } from "../../ui/layout/layout";

export const list = (program: Command) => {
	program
		.command('list')
		.description(`List all config value's`)
		.action(async () => {
			await layout(async (config, write) => {
				const params = new Params(config)

				const done = write(loadingDialog('Loading config parameters...'))

				const values = await params.list()

				done('Done loading config values')

				if(Object.keys(values).length > 0) {
					write(br())
					write(listUI(values))
				} else {
					write(dialog('warning', [ 'No config parameters found' ]))
				}
			})
		})
}
