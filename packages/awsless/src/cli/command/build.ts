import { Command } from "commander";
import { toApp } from "../../app";
import { Tasks } from "../../util/__task";
import { loadingDialog } from "../ui/layout/dialog";
import { layout } from "../ui/layout/layout";
import { Signal, derive } from "../lib/signal";
import { style, symbol } from "../style";
import { br } from "../ui/layout/basic";
import { capitalCase } from "change-case";
import { createSpinner } from "../ui/layout/spinner";
import { flexLine } from "../ui/layout/flex-line";

export const build = (program: Command) => {
	program
		.command('build')
		.argument('[stack...]', 'Optionally filter stacks to build')
		.description('Build your app')
		.action(async (filters: string[]) => {
			await layout(async (config, write, term) => {

				const { app, assets } = toApp(config, filters)

				// --------------------------------------------------------
				// Build stack assets

				const done = write(loadingDialog('Building stack assets...'))
				const groups = new Signal<any[]>([])

				write(groups)

				await Promise.all(assets.map(async (stack, assets) => {
					const group = new Signal<Array<string | Signal>>([
						br(),
						// symbol.pointerSmall,
						'   ',
						style.label(stack.name),
						br(),
					])

					groups.update(groups => [ ...groups, group ])

					await Promise.all(assets.map(async (asset) => {
						const [ icon, stop ] = createSpinner()
						const start = new Date()
						const time = new Signal('')
						const details = new Signal('')
						const status = new Signal('building')

						const line = flexLine(term, [
							icon,
							'  ',
							style.warning(asset.resource),
							' ',
							style.placeholder(symbol.pointerSmall),
							' ',
							style.info(asset.resourceName),
							' ',
						],[
							// hr,
							' [ ',
							status,
							' ]',
							details,
							time,
							br(),
						])

						group.update(group => [...group, line])

						const data = await asset.build?.()

						const diff = new Date().getTime() - start.getTime()
						time.set(' ' + style.time(diff) + style.time.dim('ms'))

						if(data) {
							details.set(' ' + Object.entries(data).map(([key, value]) => {
								return `[ ${style.label(key)}: ${style.info(value)} ]`
							}).join(' '))
						}

						status.set(style.success('done'))
						icon.set(style.success(symbol.success))
						stop()
					}))

				}))

				// --------------------------------------------------------
				// CDK synth

				// app.synth()

				done('Done building stack assets')
			})
		})
}
