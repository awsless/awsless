import wrapAnsi from 'wrap-ansi'
import { br } from './basic.js'

type Options = {
	indent?: number
	skipFirstLine?: boolean
	hard?: boolean
	wordWrap?: boolean
	trim?: boolean
}

export const textWrap = (
	text: string,
	width: number,
	{ indent = 0, skipFirstLine = false, ...rest }: Options = {}
) => {
	const space = ' '.repeat(indent)
	return wrapAnsi(text, width - indent, { hard: true, trim: false, ...rest })
		.split(br())
		.map((line, i) => (i === 0 && skipFirstLine ? line : `${space}${line}`))
		.join(br())
}
