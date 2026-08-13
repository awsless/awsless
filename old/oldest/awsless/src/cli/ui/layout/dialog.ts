import { createTimer } from '../../../util/timer.js'
import { RenderFactory } from '../../lib/renderer.js'
import { Signal } from '../../lib/signal.js'
import { style, symbol } from '../../style.js'
import { br } from './basic.js'
import { createSpinner } from './spinner.js'
import wrapAnsi from 'wrap-ansi'

type Type = keyof typeof symbol & keyof typeof style

export const dialog = (type: Type, lines: string[]): RenderFactory => {
	const padding = 2
	const icon = style[type](symbol[type].padEnd(padding))
	// const value = [
	// 	icon, ' '
	// ]

	return term => {
		term.out.write(
			lines
				.map((line, i) => {
					if (i === 0) {
						return icon + wrapAnsi(line, term.out.width(), { hard: true })
					}

					return wrapAnsi(' '.repeat(padding) + line, term.out.width(), { hard: true })
				})
				.join(br()) + br()
		)
	}
}

export const loadingDialog = (message: string): RenderFactory<(message: string) => void> => {
	const [icon, stop] = createSpinner()
	const description = new Signal(message)
	const time = new Signal<string>('')
	const timer = createTimer()

	return term => {
		term.out.write([icon, ' ', description, ' ', time, br()])

		return message => {
			description.set(message)
			time.set(timer())

			stop()
			icon.set(style.success(symbol.success))
		}
	}
}
