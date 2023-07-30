import { Assets } from "../../../util/assets.js"
import { createTimer } from "../../../util/timer.js"
import { RenderFactory } from "../../lib/renderer.js"
import { Signal, derive } from "../../lib/signal.js"
import { style, symbol } from "../../style.js"
import { br } from "../layout/basic.js"
import { loadingDialog } from "../layout/dialog.js"
import { flexLine } from "../layout/flex-line.js"
import { createSpinner } from "../layout/spinner.js"

export const assetBuilder = (assets:Assets):RenderFactory => {
	return async (term) => {
		const done = term.out.write(loadingDialog('Building stack assets...'))
		const groups = new Signal<any[]>([''])

		term.out.gap()
		term.out.write(groups)
		// term.out.write(br())

		const stackNameSize = Math.max(...Object.keys(assets.list()).map(stack => stack.length))
		const resourceSize = Math.max(...Object.values(assets.list()).map(assets => assets.map(asset => asset.resource.length)).flat())

		await Promise.all(assets.map(async (stackName, assets) => {
			const group = new Signal<Array<string | Signal>>([])

			groups.update(groups => [ ...groups, group ])

			await Promise.all(assets.map(async (asset) => {
				const [ icon, stop ] = createSpinner()
				const details = new Signal<Record<string, string>>({})

				const line = flexLine(term, [
					icon,
					'  ',
					style.label(stackName),
					' '.repeat(stackNameSize - stackName.length),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					style.warning(asset.resource),
					' '.repeat(resourceSize - asset.resource.length),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					style.info(asset.resourceName),
					' ',
				],[
					' ',
					derive([ details ], (details) => {
						return Object.entries(details).map(([key, value]) => {
							return `${style.label(key)} ${value}`
						}).join(' / ')
					}),
					br(),
				])

				group.update(group => [...group, line])

				const timer = createTimer()
				const data = await asset.build?.()

				details.set({
					...data,
					time: timer()
				})

				icon.set(style.success(symbol.success))
				stop()
			}))
		}))

		done('Done building stack assets')
		term.out.gap()
	}
}
