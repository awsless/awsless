// export const loadingDialog = (message: string): RenderFactory<(message: string) => void> => {
// 	const [icon, stop] = createSpinner()
// 	const description = new Signal(message)
// 	const time = new Signal<string>('')
// 	const timer = createTimer()

import { RenderFactory } from '../../lib/renderer.js'
import { Signal } from '../../lib/signal.js'

// 	return term => {
// 		term.out.write([icon, ' ', description, ' ', time, br()])

// 		return message => {
// 			description.set(message)
// 			time.set(timer())

// 			stop()
// 			icon.set(style.success(symbol.success))
// 		}
// 	}
// }

type TableProps = {
	layout: {}[]
	head: Array<Signal | string>
	body: Array<Signal | string>
	foot: Array<Signal | string>
}

export const table = (): RenderFactory => {
	return term => {
		term.out.write('┌───┐\n')
		term.out.write('│   │\n')
		term.out.write('├───┤\n')
		term.out.write('│   │\n')
		term.out.write('└───┘')
	}
}
