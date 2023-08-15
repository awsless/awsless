import { RenderFactory } from "../../lib/renderer.js"
import { Signal } from "../../lib/signal.js"
import { style, symbol } from "../../style.js"
import { br } from "../layout/basic.js"

export type TogglePromptOptions = {
	initial?: boolean
	active?: string
	inactive?: string
}

export const togglePrompt = (label: string, options: TogglePromptOptions = {}): RenderFactory<Promise<boolean>> => {
	return (term) => new Promise(resolve => {
		const { initial = false, active = 'on', inactive = 'off' } = options
		const icon = new Signal(style.info(symbol.question))
		const sep = new Signal(style.placeholder(symbol.pointerSmall))
		const mid = style.placeholder('/')
		const activeText = new Signal(active)
		const inactiveText = new Signal(inactive)

		let value = initial

		const activate = () => {
			activeText.set(style.success.underline(active))
			inactiveText.set(style.normal(inactive))
			value = true
		}

		const deactivate = () => {
			activeText.set(style.normal(active))
			inactiveText.set(style.success.underline(inactive))
			value = false
		}

		const toggle = () => {
			!value ? activate() : deactivate()
		}

		const reset = () => {
			initial ? activate() : deactivate()
		}

		reset()

		const release = term.in.captureInput({
			reset,
			exit() {
				release()
				icon.set(style.error(symbol.error))
				sep.set(symbol.ellipsis)
				resolve(false)
			},
			submit() {
				release()
				icon.set(style.success(symbol.success))
				sep.set(symbol.ellipsis)
				resolve(value)
			},
			input(chr) {
				switch(chr) {
					case ' ': toggle(); break
					case '1': activate(); break
					case '0': deactivate(); break
				}
			},
			delete: deactivate,
			left: deactivate,
			right: activate,
			down: deactivate,
			up: activate,
		})

		term.out.write([ icon, '  ', style.label(label), ' ', sep, ' ', inactiveText, ' ', mid, ' ', activeText, br() ])
	})
}
