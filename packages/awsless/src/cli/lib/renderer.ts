// import wrapAnsi from 'wrap-ansi'
import { Interface } from './interface.js'
import { Signal } from './signal.js'
import { Terminal } from './terminal.js'

type VisibleValue = string | Array<string | VisibleSignal> | VisibleSignal
type VisibleSignal = Signal<any>
type Fragment = string | VisibleSignal | RenderFactory | Fragment[]

export type RenderFactory<T = any> = (term: Terminal) => T

export class Renderer {
	private fragments: Array<string | VisibleSignal> = []
	private unsubs: Array<() => void> = []
	private timeout: NodeJS.Timeout | undefined
	private flushing: boolean = false
	private screen: string[] = []

	constructor(readonly output: NodeJS.WriteStream, private ins: Interface) {}

	width() {
		return this.output.columns - 3
	}

	height() {
		return this.output.rows
	}

	write<T extends RenderFactory>(fragment: T): ReturnType<T>
	write<T extends Fragment>(fragment: T): T
	write<T extends Fragment>(fragment: T) {
		if (Array.isArray(fragment)) {
			fragment.forEach(i => this.write(i))
			return
		}

		if (typeof fragment === 'function') {
			return fragment({ out: this, in: this.ins })
		}

		this.fragments.push(fragment)

		this.update()

		return fragment
	}

	gap() {
		const walk = (fragment: VisibleValue): string => {
			if (typeof fragment === 'string') {
				return fragment
			}

			if (Array.isArray(fragment)) {
				return fragment.map(walk).join('')
			}

			if (fragment instanceof Signal) {
				return walk(fragment.get())
			}

			// return walk(fragment.get())
			return ''
		}

		const end = walk(this.fragments.slice(-2))

		if (end.endsWith('\n\n')) {
			// gap already filled
		} else if (end.endsWith('\n')) {
			// this.write('\n')
			this.fragments.push('\n')
		} else {
			// this.write('\n\n\n')
			this.fragments.push('\n\n')
			// this.fragments.push('\n')
			// this.fragments.push('\n')
		}

		this.update()
	}

	update() {
		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			this.flush()
		}, 0)
	}

	async end() {
		this.gap()

		await this.flush()
		clearTimeout(this.timeout)
		this.unsubs.forEach(unsub => unsub())
		this.unsubs = []

		const y = this.screen.length - 1
		await this.setCursor(0, y)

		// this.output.cursorTo?.(0, y)
		// this.output.write?.(' ')
		// this.output.cursorTo?.(0, y)

		// console.log(this.screen);
	}

	private setCursor(x: number, y: number) {
		return new Promise(resolve => {
			this.output.cursorTo?.(x, y, () => resolve(undefined))
		})
	}

	private writeString(value: string) {
		return new Promise(resolve => {
			this.output.write?.(value, () => resolve(undefined))
		})
	}

	private clearLine() {
		return new Promise(resolve => {
			this.output.clearLine?.(1, () => resolve(undefined))
		})
	}

	// private stripEscapeCode(str: string) {
	// 	return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
	// }

	// private chunkString(str: string, size: number): string[] {
	// 	const strLength: number = str.length
	// 	const numChunks: number = Math.ceil(strLength / size)
	// 	const chunks: string[] = new Array(numChunks)

	// 	for (let i = 0; i < numChunks; ++i) {
	// 		const s = i * size
	// 		chunks[i] = str.substring(s, s + size)
	// 	}

	// 	return chunks
	// }

	async flush() {
		clearTimeout(this.timeout)

		if (this.flushing) {
			this.update()
			return
		}

		const walk = (fragment: VisibleValue): string => {
			if (typeof fragment === 'string') {
				return fragment
			}

			if (Array.isArray(fragment)) {
				return fragment.map(walk).join('')
			}

			if (fragment instanceof Signal) {
				this.unsubs.push(
					fragment.subscribe(() => {
						this.update()
					})
				)

				return walk(fragment.get())
			}

			return ''
		}

		this.unsubs.forEach(unsub => unsub())
		this.unsubs = []

		// ------------------------------------------------

		// const width = this.width()
		const height = this.height()
		// const screen = wrapAnsi(walk(this.fragments), width, {
		// 	trim: false,
		// }).split('\n')

		const screen = walk(this.fragments).split('\n')

		const oldSize = this.screen.length
		const newSize = screen.length
		const size = Math.max(oldSize, newSize)
		const start = Math.max(oldSize - height, 0)

		// ------------------------------------------------
		// Extend the screen buffer

		this.flushing = true

		for (let y = start; y < size; y++) {
			const newLine = screen.at(y)
			const oldLine = this.screen.at(y)

			if (newLine !== oldLine) {
				// Force a new line when we get over our viewport...
				if (y >= oldSize && y !== 0) {
					// force new line
					const p = y - start - 1
					const x = screen.at(y - 1)?.length ?? 0

					await this.setCursor(x, p)
					await this.writeString(newLine ? '\n' + newLine : '\n')
				} else {
					await this.setCursor(0, y - start)
					if (newLine) {
						await this.writeString(newLine)
					}
					await this.clearLine()
				}
			}
		}

		await this.setCursor(0, size - start)

		// ------------------------------------------------

		this.screen = screen
		this.flushing = false
	}

	async clear() {
		await this.setCursor(0, 0)
		await this.writeString('\n'.repeat(this.height()))
		await this.setCursor(0, 0)

		if (this.output.clearScreenDown) {
			await new Promise(resolve => {
				this.output.clearScreenDown(() => resolve(undefined))
			})
		}
	}
}
