import { Actions, createInputSubscriber } from "./interface"

type Subscriber<T extends string | number> = (value: T) => void

export class Signal<T extends string | number> {
	private subs:Subscriber<T>[] = []
	constructor(private value: T) {}

	get() {
		return this.value
	}

	set(value: T) {
		this.value = value
		this.subs.forEach(sub => sub(value))
	}

	update(cb: (value:T) => T) {
		this.set(cb(this.value))
	}

	subscribe(cb:Subscriber<T>) {
		this.subs.push(cb)
	}

	derive<D extends string | number>(cb: (value:T) => D) {
		const signal = new Signal<D>(cb(this.value))

		this.subscribe((value) => {
			signal.set(cb(value))
		})

		return signal
	}

	toString() {
		return this.get()
	}
}

export type Render = (term:Terminal) => void
export type Fragment = Fragment[] | { fragment:Fragment, [key:string]: unknown } | Render | Signal<any> | string | number

export class Terminal {
	private invalidated = false
	private inputSubscriber: (actions:Actions) => () => void
	private timeout?: NodeJS.Timeout
	private chunks: string[] = []
	private ids = 0

	constructor(
		readonly input = process.stdin,
		readonly output = process.stdout
	) {
		this.write = this.write.bind(this)
		this.inputSubscriber = createInputSubscriber(this)
	}

	captureInput(actions:Actions, showCursor: boolean = false) {
		if(showCursor) {
			this.showCursor()
		}

		const unsub = this.inputSubscriber(actions)

		return () => {
			if(showCursor) {
				this.hideCursor()
			}

			unsub()
		}
	}

	bell() {
		if(this.input.isTTY) {
			this.input.write('\u0007')
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

	width() {
		return this.output.columns
	}

	height() {
		return this.output.rows
	}

	clear() {
		let count = this.height()

		while(count--) {
			this.output.write('\n')
		}

		this.output.clearScreenDown?.()
		this.output.cursorTo?.(0, 0)
	}

	write(fragment: Fragment): void
	write(template: TemplateStringsArray, ...args: Array<Fragment>): void
	write(fragmentOrTemplate: TemplateStringsArray | Fragment, ...args: Array<Fragment>) {
		if(!args?.length) {
			this._write(fragmentOrTemplate as Fragment)
		}
		else {
			(fragmentOrTemplate as TemplateStringsArray).forEach((value, index) => {
				this.register(value)
				const fragment = args[index]

				if(typeof fragment !== 'undefined') {
					this._write(fragment)
				}
			})
		}
	}

	private _write(value: Fragment) {
		if(typeof value === 'string') {
			this.register(value)
		}
		else if(typeof value === 'number') {
			this.register(value.toString())
		}
		else if (typeof value === 'function') {
			value(this)
		}
		else if(value instanceof Signal) {
			const id = this.register(value.get().toString())

			value.subscribe((value) => {
				this.update(id, value.toString())
			})
		}
		else if (Array.isArray(value)) {
			value.forEach(item => this._write(item))
		} else {
			this._write(value.fragment)
		}
	}

	private register(value: string) {
		this.chunks.push(value)
		this.invalidate()

		return this.ids++
	}

	private update(id: number, value: string) {
		this.chunks[id] = value
		this.invalidate()
	}

	invalidate() {
		this.invalidated = true
		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			this.flush()
		}, 0)
	}

	flush() {
		clearTimeout(this.timeout)

		if(this.invalidated) {
			process.stdout.cursorTo?.(0, 0)
			process.stdout.write('\x1Bc' + this.chunks.join(''))
			// process.stdout.write(`\u0033[2J`)

			this.invalidated = false
		}
	}
}

// console.log('\033[2J');
// This works on linux. Not sure about windows.

// You can "trick" the user using something like this:

// var lines = process.stdout.getWindowSize()[1];
// for(var i = 0; i < lines; i++) {
//     console.log('\r\n');
// }
// Share
// Improve this answer
// Follow
// edited Feb 26, 2012 at 18:39
// sth's user avatar
// sth
// 222k5353 gold badges281281 silver badges367367 bronze badges
// answered Feb 26, 2012 at 12:15
// sanatgersappa's user avatar
// sanatgersappa
// 4,30922 gold badges1717 silver badges1313 bronze badges
// 10
// in case somebody stubles this. On windows: process.stdout.write('\033c');, as '\033[2J' only clears current application stream, and '\033c'
