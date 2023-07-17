import { Interface } from "./interface"
import { Signal } from "./signal"
import { Terminal } from "./terminal"

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

	update() {
		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			this.flush()
		}, 0)
	}

	flush() {
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

		// const screen = walk(this.fragments).split('\n')
		// const height = Math.max(this.screen.length, screen.length)

		// for(let y = 0; y < height; y++) {
		// 	const newLine = screen[y] || ''
		// 	const oldLine = this.screen[y] || ''

		// 	if(oldLine === newLine) {
		// 		continue
		// 	}

		// 	const width = Math.max(newLine.length, oldLine.length)

		// 	let start:number | undefined

		// 	for(let x = 0; x < width; x++) {
		// 		const char = newLine[x]
		// 		if(char !== oldLine[y]) {
		// 			if(typeof start === 'undefined') {
		// 				start = x
		// 			}
		// 		} else if(typeof start === 'number') {
		// 			this.output.cursorTo?.(start, y)
		// 			this.output.write?.(newLine.substring(start, x))
		// 			start = undefined
		// 		}
		// 	}

		// 	if(typeof start === 'number') {
		// 		this.output.cursorTo?.(start, y)
		// 		this.output.write?.(newLine.substring(start, width))
		// 		this.output.clearLine(1)
		// 	}
		// }

		// this.output.cursorTo?.(screen[height-1].length - 1, height)
		// this.screen = screen

		// ------------------------------------------------

		const screen	= walk(this.fragments).split('\n')
		const oldSize	= this.screen.length
		const newSize	= screen.length
		const size		= Math.max(oldSize, newSize)
		const height	= this.height()
		const start 	= Math.max(oldSize - height, 0)

		// ------------------------------------------------
		// Extend the screen buffer

		// console.log(oldSize);
		// console.log(newSize);
		// process.exit(0)

		// let count = 0

		// console.log(oldSize, height, start);

		// process.exit(0)

		for(let y = start; y < size; y++) {
			const line = screen[y]
			if(line !== this.screen[y]) {
				// Force a new line when we get over our viewport...
				if(y > oldSize) {
					// force new line
					const x = (this.screen[y - 1]?.length || 0) - 1
					this.output.cursorTo?.(x, y - 1)
					this.output.write?.('\n' + line)
				} else {
					this.output.cursorTo?.(0, y)
					this.output.write?.(line)
				}
				this.output.clearLine?.(1)
				// this.output.write?.('---')
				// this.output.write?.(y.toString())
				// this.output.clearLine?.(1)
			}
		}

		// process.exit(0)

		// if(oldSize < newSize) {
		// 	const x = this.screen[oldSize - 1]?.length || 0
		// 	// console.log(x, oldSize);
		// 	this.output.cursorTo?.(x, oldSize)

		// 	for(let y = oldSize; y < newSize; y++) {
		// 		console.log('-----------' + y)
		// 		// this.output.write?.('\n ' + y)
		// 		// this.output.write?.((++count)+'\n')
		// 		// count++
		// 	}
		// }

		// console.log(count)
		// process.exit(0)
		// return

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

	clear() {
		let count = this.output.rows

		while(count--) {
			this.output.write('\n')
		}

		this.output.cursorTo?.(0, 0)
		this.output.clearScreenDown?.()
	}
}
