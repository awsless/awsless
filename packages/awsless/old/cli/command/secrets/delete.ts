
import { Command } from "commander";
import { Params } from '../../../util/param.js';
import { list } from '../../ui/layout/list.js';
import { dialog, loadingDialog } from '../../ui/layout/dialog.js';
import { style } from '../../style.js';
import { layout } from '../../ui/layout/layout.js';
import { confirmPrompt } from '../../ui/prompt/confirm.js';
import { Cancelled } from '../../error.js';

export const del = (program: Command) => {
	program
		.command('delete <name>')
		.description('Delete a secret value')
		.action(async (name: string) => {
			await layout(async (config, write) => {
				const params = new Params(config)

				write(dialog('warning', [`Your deleting the ${style.info(name)} secret parameter`]))
				const confirm = await write(confirmPrompt('Are you sure?'))

				if(!confirm) {
					throw new Cancelled()
				}

				const done = write(loadingDialog(`Deleting remote secret parameter`))

				const value = await params.get(name)
				await params.delete(name)

				done(`Done deleting remote secret parameter`)

				write(list({
					Name: name,
					Value: value || style.error('(empty)'),
				}))
			})
		})
}
