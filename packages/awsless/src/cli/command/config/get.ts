import { Command } from "commander";
import { Params } from "../../../util/param";
import { list } from "../../ui/layout/list";
import { loadingDialog } from "../../ui/layout/dialog";
import { br } from "../../ui/layout/basic";
import { style } from "../../style";
import { layout } from "../../ui/layout/layout";

export const get = (program: Command) => {
	program
		.command('get <name>')
		.description('Get a config value')
		.action(async (name: string) => {
			await layout(async (config, write) => {
				const params = new Params(config)

				const done = write(loadingDialog(`Getting remote config parameter`))

				const value = await params.get(name)

				done(`Done getting remote config parameter`)

				write(br())
				write(list({
					Name: name,
					Value: value || style.error('(empty)'),
				}))
			})
		})
}
