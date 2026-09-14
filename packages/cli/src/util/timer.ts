import hrtime from 'pretty-hrtime'
import { color } from '../cli/ui/style.js'

// A timer can start from an earlier hrtime, for work that began before
// its progress line did.
export const createTimer = (since?: [number, number]) => {
	const start = since ?? process.hrtime()

	return () => {
		const end = process.hrtime(start)
		const [time, unit] = hrtime(end).split(' ')

		return color.attr(time) + color.attr.dim(unit)
	}
}
