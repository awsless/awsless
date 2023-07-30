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
	private screen: string[] = []

	constructor(readonly output:NodeJS.WriteStream, private ins: Interface) {}

	width() {
		return this.output.columns
	}

	height() {
		return this.output.rows
	}

	write<T extends RenderFactory>(fragment: T): ReturnType<T>
	write<T extends Fragment>(fragment: T): T
	write<T extends Fragment>(fragment: T) {
		if(Array.isArray(fragment)) {
			fragment.forEach(i => this.write(i))
			return
		}

		if(typeof fragment === 'function') {
			return fragment({ out: this, in: this.ins })
		}

		this.fragments.push(fragment)

		this.update()

		return fragment
	}

	gap() {
		const walk = (fragment: VisibleValue): string => {
			if(typeof fragment === 'string') {
				return fragment
			}

			if(Array.isArray(fragment)) {
				return fragment.map(walk).join('')
			}

			return walk(fragment.get())
		}

		const end = walk(this.fragments.slice(-2))

		if(end.endsWith('\n\n')) {
			// gap already filled
		} else if(end.endsWith('\n')) {
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

		const y = this.screen.length - 1
		await this.setCursor(0, y)


		// this.output.cursorTo?.(0, y)
		// this.output.write?.(' ')
		// this.output.cursorTo?.(0, y)

		// console.log(this.screen);

	}

	private setCursor(x:number, y:number) {
		return new Promise(resolve => {
			this.output.cursorTo?.(x, y, () => resolve(undefined))
		})
	}

	private writeString(value:string) {
		return new Promise(resolve => {
			this.output.write?.(value, () => resolve(undefined))
		})
	}

	private clearLine() {
		return new Promise(resolve => {
			this.output.clearLine?.(1, () => resolve(undefined))
		})
	}

	async flush() {
		clearTimeout(this.timeout)

		const walk = (fragment: VisibleValue): string => {
			if(typeof fragment === 'string') {
				return fragment
			}

			if(Array.isArray(fragment)) {
				return fragment.map(walk).join('')
			}

			this.unsubs.push(fragment.subscribe(() => {
				this.update()
			}))

			return walk(fragment.get())
		}

		this.unsubs.forEach(unsub => unsub())
		this.unsubs = []

		// ------------------------------------------------

		const screen	= walk(this.fragments).split('\n')
		const height	= this.height()
		const oldSize	= this.screen.length
		const newSize	= screen.length
		const size		= Math.max(oldSize, newSize)
		const start 	= Math.max(oldSize - height, 0)

		// ------------------------------------------------
		// Extend the screen buffer

		for(let y = start; y < size; y++) {
			const newLine = screen[y]
			const oldLine = this.screen[y]

			if(newLine !== oldLine) {
				// Force a new line when we get over our viewport...
				if(y >= oldSize && y !== 0) {
					// force new line
					const p = y - start - 1
					const x = screen[y - 1]?.length || 0
					// this.output.cursorTo?.(x, p)
					// this.output.write?.('\n' + line)
					await this.setCursor(x, p)
					await this.writeString('\n' + newLine)
					// await this.writeString('\n' + y)
					// await this.clearLine()
				} else {
					// this.output.cursorTo?.(0, y - start)
					// this.output.write?.(line)
					await this.setCursor(0, y - start)
					await this.writeString(newLine)
					// await this.writeString(y + '')
					await this.clearLine()
				}
			}
		}

		// ------------------------------------------------
		// Write to updated lines

		// for(let y = 0; y < size; y++) {
		// 	const line = screen[y]
		// 	if(line !== this.screen[y]) {
		// 		this.output.cursorTo?.(0, y)
		// 		this.output.write?.(line)
		// 		this.output.write?.('---')
		// 		this.output.write?.(y.toString())
		// 		// this.output.clearLine?.(1)
		// 	}
		// }

		// this.output.cursorTo?.(screen[height-1].length - 1, height)
		this.screen = screen
	}

	async clear() {
		await this.setCursor(0, 0)
		await this.writeString('\n'.repeat(this.height()))
		await this.setCursor(0, 0)

		if(this.output.clearScreenDown) {
			await new Promise(resolve => {
				this.output.clearScreenDown(() => resolve(undefined))
			})
		}
	}
}
