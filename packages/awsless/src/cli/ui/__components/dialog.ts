import { RenderFactory } from "../../lib/renderer.js"
import { Signal } from "../../lib/signal.js"
import { style, symbol } from "../../style.js"
import { br } from "./basic.js"
import { createSpinner } from "./spinner.js"

type Type = keyof typeof symbol & keyof typeof style

export const dialog = (type: Type, lines: string[]) => {
	const padding = 3
	const icon = style[type](symbol[type].padEnd(padding))

	return lines.map((line, i) => {
		if(i === 0) {
			return icon + line
		} else {
			return ' '.repeat(padding) + line
		}
	}).join(br()) + br()
}

export const loadingDialog = (message: string): RenderFactory<(message:string) => void> => {
	const [ icon, stop ] = createSpinner()
	const description = new Signal(message)
	const time = new Signal<string>('')
	const start = new Date()

	return (term) => {
		term.out.write([
			icon,
			'  ',
			description,
			' ',
			time,
			br()
		])

		return (message) => {
			const end = new Date()
			const diff = end.getTime() - start.getTime()

			description.set(message)
			time.set(style.attr(diff) + style.attr.dim('ms'))

			stop()
			icon.set(style.success(symbol.success))
		}
	}
}
