// const cliCursor = require('cli-cursor')
// const ansi = require('ansi')
// const cursor = ansi(process.stdout)
// const {render, Text} = require('ink')

// const getCursorPos = () => new Promise((resolve) => {
//     const termcodes = { cursorGetPosition: '\u001b[6n' };

//     process.stdin.setEncoding('utf8');
//     process.stdin.setRawMode(true);

//     const readfx = function () {
//         const buf = process.stdin.read();
//         const str = JSON.stringify(buf); // "\u001b[9;1R"
//         const regex = /\[(.*)/g;
//         const xy = regex.exec(str)[0].replace(/\[|R"/g, '').split(';');
// 		// console.log(xy);
//         // const pos = { rows: xy[0], cols: xy[1] };
//         process.stdin.setRawMode(false);
//         resolve(Number(xy[0]));
//     }

//     process.stdin.once('readable', readfx);
//     process.stdout.write(termcodes.cursorGetPosition);
// })


const createSignal = (value) => {
	const subs = []
	return {
		get: () => value,
		set: (newValue) => {
			value = newValue
			subs.forEach(sub => sub(value))
		},
		subscribe(cb) {
			subs.push(cb)
		}
	}
}


class Terminal {
	constructor() {
		this.output = process.stdout
		this.invalidate = undefined
		this.timeout = undefined
		this.lastId = 0
		this.chunks = []
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

		this.output.clearScreenDown()
		this.output.cursorTo(0, 0)
	}

	line(template, ...signals) {
		this.write([ ...template, '\n' ], ...signals)
	}

	break() {
		this.write`\n`
	}

	write(template, ...signals) {
		template.forEach((value, index) => {
			this.register(value)

			const signal = signals[index]

			if(signal) {
				const id = this.register(signal.get())

				signal.subscribe((value) => {
					this.update(id, value)
				})
			}
		})
	}

	register(value) {
		const id = this.lastId++

		this.chunks.push({
			id,
			x: 0,
			y: 0,
		})

		this.update(id, value)

		return id
	}

	update(id, value) {
		const chunk = this.chunks.at(id)
		chunk.value = value

		if(this.invalidate === undefined || this.invalidate > id) {
			this.invalidate = id
		}

		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			this.render()
		}, 0)
	}

	render() {
		if(typeof this.invalidate === 'undefined') {
			return
		}

		process.stdout.cursorTo(0, 0)
		process.stdout.write(this.chunks.map(chunk => chunk.value).join(''))

		// cursor.goto(cursorX, cursorY)
		// 	.write(text.join(''))

		this.invalidate = undefined
	}

	// render() {
	// 	if(typeof this.invalidate === 'undefined') {
	// 		return
	// 	}

	// 	const text = []
	// 	const size = this.chunks.length
	// 	const last = this.chunks[this.invalidate]

	// 	let prev = this.chunks[this.invalidate - 1] || { x: 0, y: 0, value: '' }

	// 	for(let index = this.invalidate; index < size; index++) {
	// 		const chunk = this.chunks[index]
	// 		const parts = prev.value.split(/\n/g)
	// 		const breaks = parts.length - 1

	// 		if(breaks > 0) {
	// 			const chars = parts.at(-1)
	// 			if(chars === '\n') {
	// 				chunk.x = 0
	// 			} else {
	// 				chunk.x = chars.length
	// 			}
	// 		} else {
	// 			chunk.x = prev.x + prev.value.length
	// 		}

	// 		chunk.y = prev.y + breaks

	// 		text.push(chunk.value)
	// 		prev = chunk
	// 	}

	// 	// height = prev.y

	// 	// console.log(startY);
	// 	// console.log(last.x, last.y);
	// 	// console.log(text);

	// 	const height = this.height()

	// 	let cursorX = last.x
	// 	let cursorY = last.y

	// 	if(cursorY > height) {
	// 		return
	// 	}

	// 	// console.log(invalidate, last.x, last.y);
	// 	// console.log(cursorX, cursorY);

	// 	process.stdout.cursorTo(cursorX, cursorY)
	// 	process.stdout.write(text.join(''))

	// 	// cursor.goto(cursorX, cursorY)
	// 	// 	.write(text.join(''))

	// 	this.invalidate = undefined
	// }
}

// process.stdin.setRawMode(true)
// process.stdin.on('data', (data) => console.log('data', data.toString('utf8')))
// process.stdin.on('readable', (data) => console.log('readable', process.stdin.read().toString()))

// setTimeout(() => {
// 	process.stdin.setRawMode(false)
// 	process.exit(0)
// }, 5000)

const main = async () => {
	const term = new Terminal()

	const count = createSignal('1')
	const name = createSignal('Jack')

	// term.write`\n\n\n\n\n\n\n\n\n\n\n\n`
	// term.write`\n\n\n\n\n\n\n\n\n\n\n\n`

	term.clear()
	term.line`--------------------------`
	term.break()
	term.line`➜  Number: ${count}`
	term.line`   Name: ${name}`
	term.break()
	term.line`--------------------------`

	setTimeout(() => {
		count.set('2')
	}, 500)

	setTimeout(() => {
		count.set('3')
	}, 1000)

	setTimeout(() => {
		name.set('Other')
	}, 1500)

}

main()

// return [
// 	[
// 		colors.primary('➜'.padEnd(3)),
// 		colors.label('App:'.padEnd(10)),
// 		config.name,
// 	].join(''),
// 	[
// 		' '.repeat(3),
// 		colors.label('Stage:'.padEnd(10)),
// 		config.stage,
// 	].join(''),
// 	[
// 		' '.repeat(3),
// 		colors.label('Region:'.padEnd(10)),
// 		config.region,
// 	].join(''),
// 	[
// 		' '.repeat(3),
// 		colors.label('Profile:'.padEnd(10)),
// 		config.profile,
// 	].join(''),
// 	// Stage:   dev
// 	// Console: https://console.sst.dev/rollin/dev
// ].join('\n')

// process.stdout.write('1')
// process.stdout.write('\n')
// process.stdout.cursorTo(1)
// process.stdout.write('2')
// process.stdout.write('3')
