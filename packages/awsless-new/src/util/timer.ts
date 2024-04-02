import hrtime from 'pretty-hrtime'
import { color } from '../cli/ui/style.js'

export const createTimer = () => {
	const start = process.hrtime()

	return () => {
		const end = process.hrtime(start)
		const [time, unit] = hrtime(end).split(' ')

		return color.attr(time) + color.attr.dim(unit)
	}
}
