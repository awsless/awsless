import { Command } from "commander";
import { Params } from '../../../util/param.js';
import { list } from '../../ui/layout/list.js';
import { loadingDialog } from '../../ui/layout/dialog.js';
import { br } from '../../ui/layout/basic.js';
import { style } from '../../style.js';
import { layout } from '../../ui/layout/layout.js';

export const get = (program: Command) => {
	program
		.command('get <name>')
		.description('Get a secret value')
		.action(async (name: string) => {
			await layout(async (config, write) => {
				const params = new Params(config)

				const done = write(loadingDialog(`Getting remote secret parameter`))

				const value = await params.get(name)

				done(`Done getting remote secret parameter`)

				write(list({
					Name: name,
					Value: value || style.error('(empty)'),
				}))
			})
		})
}
