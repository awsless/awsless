import { RenderFactory } from "../../lib/renderer"
import { Signal } from "../../lib/signal"
import { style, symbol } from "../../style"
import { br } from "./basic"
import { createSpinner } from "./spinner"

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
			time.set(style.time(diff) + style.time.dim('ms'))

			stop()
			icon.set(style.success(symbol.success))
		}
	}
}
