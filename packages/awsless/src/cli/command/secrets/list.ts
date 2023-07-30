import { Command } from "commander";
import { Params } from '../../../util/param.js';
import { dialog, loadingDialog } from '../../ui/layout/dialog.js';
import { list as listUI } from '../../ui/layout/list.js';
import { br } from '../../ui/layout/basic.js';
import { layout } from '../../ui/layout/layout.js';

export const list = (program: Command) => {
	program
		.command('list')
		.description(`List all secret value's`)
		.action(async () => {
			await layout(async (config, write) => {
				const params = new Params(config)

				const done = write(loadingDialog('Loading secret parameters...'))

				const values = await params.list()

				done('Done loading secret values')

				if(Object.keys(values).length > 0) {
					write(br())
					write(listUI(values))
				} else {
					write(dialog('warning', [ 'No secret parameters found' ]))
				}
			})
		})
}
