import { ReadLine, createInterface, emitKeypressEvents } from "readline";
import { debug } from '../logger.js';
import { exec } from "child_process";

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

export class Interface {
	// private subscriber: Actions | undefined
	private readline: ReadLine

	constructor(private input: NodeJS.ReadStream) {
		this.readline = createInterface({ input: this.input, escapeCodeTimeout: 50 })
		emitKeypressEvents(this.input, this.readline)
		this.hideCursor()

		if(this.input.isTTY) {
			this.input.setRawMode(true)
		}

		this.input.on('keypress', (_, key:Key) => {
			const action = parseAction(key)

			if(action === 'abort') {
				this.unref()
				process.exit(1)
			}
		})
	}

	unref() {
		this.showCursor()
		this.input.unref()
	}

	captureInput(actions:Actions) {
		debug('Subscribe to user input...')

		const keypress = (value: string, key: Key) => {
			const action = parseAction(key)

			if(typeof action === 'undefined') {
				// do something ???
				this.bell()
			}
			else {
				const cb = actions[action]
				if(typeof cb === 'function') {
					cb(value, key)
				} else {
					// BELL
					this.bell()
				}
			}
		}

		this.input.on('keypress', keypress)

		return () => {
			this.input.off('keypress', keypress)
			debug('Unsubscribe to user input')
		}
	}

	hideCursor() {
		if(this.input.isTTY) {
			this.input.write('\u001B[?25l')
		}
	}

	showCursor() {
		if(this.input.isTTY) {
			this.input.write('\u001B[?25h')
		}
	}

	bell() {
		if(this.input.isTTY) {
			// this.input.write('\x07')
			// this.input.write('\u0007')
			exec('afplay /System/Library/Sounds/Tink.aiff')
		}
	}
}
