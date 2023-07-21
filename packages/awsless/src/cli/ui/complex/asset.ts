import { Assets } from "../../../util/assets.js"
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
		const groups = new Signal<any[]>([ br() ])

		term.out.write(groups)

		const stackNameSize = Math.max(...Object.keys(assets.list()).map(stack => stack.length))

		await Promise.all(assets.map(async (stack, assets) => {
			const group = new Signal<Array<string | Signal>>([])

			groups.update(groups => [ ...groups, group ])

			await Promise.all(assets.map(async (asset) => {
				const [ icon, stop ] = createSpinner()
				const start = new Date()
				const details = new Signal<Record<string, string>>({})

				const line = flexLine(term, [
					icon,
					'  ',
					style.label(stack.name),
					' '.repeat(stackNameSize - stack.name.length),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					style.warning(asset.resource),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					style.info(asset.resourceName),
					' ',
				],[
					' ',
					derive([ details ], (details) => {
						return Object.entries(details).map(([key, value]) => {
							return `${style.label(key)}: ${value}`
						}).join(' / ')
					}),
					br(),
				])

				group.update(group => [...group, line])

				const data = await asset.build?.()
				const time = new Date().getTime() - start.getTime()

				details.set({
					...data,
					time: style.attr(time) + style.attr.dim('ms')
				})


				// time.set(' / ' + style.attr(diff) + style.attr.dim('ms'))

				// if(data) {
				// 	details.set(Object.entries(data).map(([key, value]) => {
				// 		return ` / ${style.label(key)}: ${style.info(value)}`
				// 	}).join(' / '))
				// }

				// status.set(style.success('done'))
				icon.set(style.success(symbol.success))
				stop()
			}))
		}))

		done('Done building stack assets')
	}
}
