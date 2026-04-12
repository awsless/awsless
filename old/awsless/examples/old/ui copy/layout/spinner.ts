import { style } from "../../style"
import { Signal } from "../../__ui copy/terminal"

const frames = [ '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏' ]
const length = frames.length

const getFrame = (index:number) => {
	return style.info(frames[index % length])
}

export const spinner = () => {
	let index = 0
	const signal = new Signal<string>(getFrame(0))
	const interval = setInterval(() => {
		signal.set(getFrame(++index))
	}, 80)

	return {
		fragment: signal,
		stop() {
			clearInterval(interval)
		}
	}
}
