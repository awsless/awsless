import hrtime from 'pretty-hrtime'
import { style } from '../cli/style'

export const createTimer = () => {
	const start = process.hrtime()

	return () => {
		const end = process.hrtime(start)
		const [ time, unit ] = hrtime(end).split(' ')

		return style.attr(time) + style.attr.dim(unit)
	}
}
