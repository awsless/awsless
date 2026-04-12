import { style, symbol } from "../../style"
import { Signal } from "../../__ui copy/terminal"
import { br } from "./basic"
import { spinner } from "./spinner"

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

export const loadingDialog = (lines: string[]) => {
	const icon = spinner()
	const description = new Signal<string>(lines.join(br()))
	const time = new Signal<string>('')

	const start = new Date()

	return {
		fragment: [
			icon,
			' '.repeat(2),
			description,
			' ',
			time,
			br()
		],
		done(messages: string[]) {
			const end = new Date()
			const diff = end.getTime() - start.getTime()

			description.set(messages.join(br()))
			time.set(style.time(diff) + style.time.dim('ms'))

			icon.stop()
			icon.fragment.set(style.success(symbol.success))
		}
	}
}
