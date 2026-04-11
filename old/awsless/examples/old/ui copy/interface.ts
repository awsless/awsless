import { createInterface, emitKeypressEvents } from "readline";
import { Terminal } from "./terminal";
import { debug } from "./logger";

type Key = {
	sequence: string
	name: string
	meta: boolean
	shift: boolean
	ctrl: boolean
}

type Action = (
	'abort' |
	'reset' | 'exit' |
	'first' | 'last' |
	'previous' | 'next' |
	'submit' |
	'delete' | 'deleteForward' |
	'up' | 'down' | 'left' | 'right' |
	'input'
)

type Callback = (value: string, key: Key) => void
export type Actions = Partial<Record<Action, Callback>>

const parseAction = (key: Key): Action | undefined => {
	if (key.meta && key.name !== 'escape') {
		return
	}

	if (key.ctrl) {
		if (key.name === 'a') return 'first'
		if (key.name === 'c') return 'abort'
		if (key.name === 'd') return 'abort'
		if (key.name === 'e') return 'last'
		if (key.name === 'g') return 'reset'
	}

	if (key.name === 'return') return 'submit'
	if (key.name === 'enter') return 'submit' // ctrl + J
	if (key.name === 'backspace') return 'delete'
	if (key.name === 'delete') return 'deleteForward'
	if (key.name === 'abort') return 'abort'
	if (key.name === 'escape') return 'exit'

	if (key.name === 'tab' && key.shift) return 'previous'
	if (key.name === 'tab') return 'next'
	// if (key.name === 'pagedown') return 'nextPage'
	// if (key.name === 'pageup') return 'prevPage'
	// if (key.name === 'home') return 'home'
	// if (key.name === 'end') return 'end'

	if (key.name === 'up') return 'up'
	if (key.name === 'down') return 'down'
	if (key.name === 'right') return 'right'
	if (key.name === 'left') return 'left'

	return 'input'
}

export const createInputSubscriber = (term: Terminal) => {
	const readline = createInterface({ input: term.input, escapeCodeTimeout: 50 })
	let subscriber:Actions | undefined
	emitKeypressEvents(term.input, readline)
	if(term.input.isTTY) {
		term.input.setRawMode(true)
	}

	term.input.on('keypress', (value: string, key: Key) => {
		const action = parseAction(key)

		if(typeof action === 'undefined') {
			// do something ???
		}
		else if(action === 'abort') {
			term.showCursor()
			term.output.write('\n')
			process.exit(1)
		}
		else if(subscriber) {
			const cb = subscriber[action]
			if(typeof cb === 'function') {
				cb(value, key)
			} else {
				// BELL
				term.bell()
			}
		}
	})

	return (actions:Actions) => {
		subscriber = actions
		debug('Subscribe to user input...')
		return () => {
			subscriber = undefined
			debug('Unsubscribe to user input')
		}
	}
}

// export const captureInput = (term: Terminal, actions:Actions): Release => {
// 	const readline = createInterface({ input: term.input, escapeCodeTimeout: 50 })
// 	const keypress = (value: string, key: Key) => {
// 		const a = action(key)
// 		if(typeof a === 'undefined') {
// 			// do something ???
// 		} else {
// 			const cb = actions[a]
// 			if(typeof cb === 'function') {
// 				cb(value, key)
// 			} else {
// 				term.bell()
// 			}
// 		}
// 	}

// 	emitKeypressEvents(term.input, readline);

// 	if (term.input.isTTY) {
// 		term.input.setRawMode(true)
// 	}
// 	// const lol = readline.prompt()

// 	term.input.on('keypress', keypress)
// 	term.showCursor()

// 	return () => {
// 		term.input.off('keypress', keypress)

// 		if (term.input.isTTY) {
// 			term.input.setRawMode(false)
// 		}

// 		term.hideCursor()
	// }
