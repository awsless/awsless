
import { Signal, derive } from '../../lib/signal.js'
import { Terminal } from '../../lib/terminal.js'
import { style } from '../../style.js'

const stripEscapeCode = (str:string) => {
	return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}

export const flexLine = (term:Terminal, left:Array<Signal<string> | string>, right:Array<Signal<string> | string>, reserveSpace = 0) => {
	const deps = [...left, ...right]
	const strings = deps.filter(dep => typeof dep === 'string') as string[]
	const signals = deps.filter(dep => dep instanceof Signal) as Signal[]

	const stringSize = stripEscapeCode(strings.join('')).length

	return new Signal([
		...left,
		derive(signals, (...deps) => {
			const signalSize = stripEscapeCode(deps.join('')).length
			const size = term.out.width() - signalSize - stringSize - reserveSpace

			return style.placeholder('─'.repeat(size))
		}),
		...right,
	])
}
