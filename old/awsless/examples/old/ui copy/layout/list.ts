import { style } from "../../style"
import { Fragment } from "../../__ui copy/terminal"
import { br } from "./basic"

export const list = (data: Record<string, string>): Fragment => {
	const padding = 3
	const gap = 1
	const size = Object.keys(data).reduce((total, name) => {
		return name.length > total ? name.length : total
	}, 0)

	return Object.entries(data).map(([ name, value ]) => [
		' '.repeat(padding),
		style.label((name+':').padEnd(size + gap + 1)),
		value,
		br(),
	])
}
