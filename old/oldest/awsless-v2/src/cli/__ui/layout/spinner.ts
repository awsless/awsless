import { Signal, derive } from '../../__lib/signal.js'
import { style } from '../../ui/style.js'

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const length = frames.length

export const createSpinner = () => {
	const index = new Signal(0)
	const frame = derive([index], index => style.info(frames[index % length]))
	const interval = setInterval(() => {
		index.update(i => i + 1)
	}, 80)

	return [
		frame,
		() => {
			clearInterval(interval)
		},
	] as const
}
