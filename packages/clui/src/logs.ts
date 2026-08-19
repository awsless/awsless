import { log, intro as p_intro, note as p_note, outro as p_outro } from '@clack/prompts'
import Table from 'cli-table3'
import * as ansi from './ansi'
import { color } from './colors'
import { Cancelled } from './error'
import * as symbols from './symbols'

const endMargin = 3

export const intro = (title = '') => {
	p_intro(ansi.truncate(title, process.stdout.columns - 6 - endMargin))
}

export const outro = (title = '') => {
	p_outro(ansi.truncate(title, process.stdout.columns - 6 - endMargin))
}

export const note = (title: string, message: string) => {
	const width = process.stdout.columns - 6 - endMargin
	p_note(
		ansi.wrap(message, width, {
			hard: true,
		}),
		ansi.truncate(title, width)
	)
}

const logMessage = (symbol: string, message: string) => {
	log.message(
		ansi.wrap(message, process.stdout.columns - 6 - endMargin, {
			hard: true,
			trim: false,
		}),
		{ symbol }
	)
}

export const message = (message: string, symbol: string = color.gray(symbols.message)) => logMessage(symbol, message)
export const error = (message: string) => logMessage(color.red(symbols.error), message)
export const info = (message: string) => logMessage(color.blue(symbols.info), message)
export const step = (message: string) => logMessage(color.green(symbols.step), message)
export const warning = (message: string) => logMessage(color.yellow(symbols.warning), message)
export const success = (message: string) => logMessage(color.green(symbols.success), message)

export const list = (title: string, data: Record<string, string>) => {
	const padName = ansi.pad(Object.keys(data))

	note(
		title,
		Object.entries(data)
			.map(([name, value]) => {
				return color.reset.whiteBright.bold(padName(name + ':', 2)) + value
			})
			.join('\n')
	)
}

// Our own spinner instead of clack's, whose ctrl-c handler exits the
// whole process with code 0. A cancel here surfaces as an onCancel
// callback, so the task can throw Cancelled through the normal error path.
const spinner = (opts: { onCancel?: () => void } = {}) => {
	const frames = ['◒', '◐', '◓', '◑']
	const interactive = process.stdout.isTTY && process.env.CI !== 'true'

	let text = ''
	let frame = 0
	let dots = 0
	let timer: NodeJS.Timeout | undefined
	let started = false

	const render = () => {
		const trail = '.'.repeat(Math.floor(dots)).slice(0, 3)
		process.stdout.write(`\r\x1b[2K${color.magenta(frames[frame]!)}  ${text}${trail}`)
		frame = frame + 1 < frames.length ? frame + 1 : 0
		dots = dots < frames.length ? dots + 0.125 : 0
	}

	// Raw mode swallows keystrokes while the spinner runs & turns a
	// ctrl-c into input data instead of a SIGINT.
	const onData = (data: Buffer) => {
		if (data.toString() === '\x03') {
			opts.onCancel?.()
		}
	}

	return {
		start(message = '') {
			started = true
			text = message
			process.stdout.write(`${color.gray(symbols.message)}\n`)

			if (interactive) {
				process.stdout.write('\x1b[?25l')
				render()
				timer = setInterval(render, 80)
			} else {
				process.stdout.write(`${color.magenta(frames[0]!)}  ${text}...\n`)
			}

			if (process.stdin.isTTY) {
				process.stdin.setRawMode(true)
				process.stdin.on('data', onData)
				process.stdin.resume()
			}
		},
		message(message = '') {
			text = message
		},
		stop(message = '', code = 0) {
			if (!started) {
				return
			}

			started = false

			if (process.stdin.isTTY) {
				process.stdin.off('data', onData)
				process.stdin.setRawMode(false)
				process.stdin.pause()
			}

			const symbol =
				code === 0 ? color.green(symbols.step) : code === 1 ? color.red('■') : color.red(symbols.error)

			if (interactive) {
				clearInterval(timer)
				process.stdout.write(`\r\x1b[2K${symbol}  ${message || text}\n\x1b[?25h`)
			} else {
				process.stdout.write(`${symbol}  ${message || text}\n`)
			}
		},
	}
}

type TaskOptions<T> = {
	initialMessage: string
	errorMessage?: string
	successMessage?: string
	task: (context: {
		updateMessage: (message: string) => void
		updateErrorMessage: (message: string) => void
		updateSuccessMessage: (message: string) => void
	}) => Promise<T>
}

export const task = async <T>(opts: TaskOptions<T>): Promise<T> => {
	let initialMessage = opts.initialMessage
	let successMessage = opts.successMessage
	let errorMessage = opts.errorMessage

	let cancel!: () => void
	const cancelled = new Promise<never>((_, reject) => {
		cancel = () => reject(new Cancelled())
	})

	const spin = spinner({ onCancel: () => cancel() })
	spin.start(ansi.truncate(opts.initialMessage, process.stdout.columns - 6 - endMargin))

	const stop = (message?: string, code?: number) => {
		spin.stop(ansi.truncate(message ?? initialMessage, process.stdout.columns - 6 - endMargin), code)
	}

	const work = opts.task({
		updateMessage(m) {
			spin.message(ansi.truncate(m, process.stdout.columns - 6 - endMargin))
			initialMessage = m
		},
		updateSuccessMessage(m) {
			successMessage = m
		},
		updateErrorMessage(m) {
			errorMessage = m
		},
	})

	try {
		const result = await Promise.race([work, cancelled])

		stop(successMessage)
		return result
	} catch (error) {
		if (error instanceof Cancelled) {
			// The losing task keeps running until the process exits.
			work.catch(() => {})
			stop(initialMessage, 1)
		} else {
			stop(errorMessage, 2)
		}

		throw error
	}
}

export const table = (props: { head: string[]; body: (string | number | boolean)[][] }) => {
	log.message()

	const length = Math.max(props.head.length, ...props.body.map(b => b.length))
	const padding = 2
	const totalPadding = padding * 2 * length

	const border = 1
	const totalBorder = (length - 1) * border + 2

	const windowSize = process.stdout.columns
	const maxTableSize = windowSize - totalPadding - totalBorder - endMargin

	const contentSizes = Array.from({ length }).map((_, i) => {
		return Math.max(ansi.length(props.head[i] ?? ''), ...props.body.map(b => ansi.length(String(b[i]))))
	})

	const columnSizes = Array.from({ length }).map(() => {
		return 0
	})

	let leftover = Math.min(
		maxTableSize,
		contentSizes.reduce((total, size) => total + size, 0)
	)

	while (leftover > 0) {
		for (let x = 0; x < columnSizes.length; x++) {
			const columnSize = columnSizes[x]!
			const contentSize = contentSizes[x]!

			if (leftover > 0 && columnSize < contentSize) {
				leftover--
				columnSizes[x] = columnSize + 1
			}
		}
	}

	const table = new Table({
		head: props.head.map(
			(value, x) =>
				'\n' +
				color.reset.whiteBright.bold(
					ansi.wrap(value, columnSizes[x]!, {
						hard: true,
					})
				)
		),
		style: {
			'padding-left': padding,
			'padding-right': padding,
		},
		chars: {
			'bottom-right': '╯',
			'top-right': '╮',
			'top-left': '├',
			'bottom-left': '├',
		},
	})

	table.push(
		...props.body.map(row => {
			return row.map((value, x) => {
				if (typeof value === 'boolean') {
					return value ? color.green('yes') : color.red('no')
				}

				if (typeof value === 'number') {
					return color.blue(value)
				}

				return ansi.wrap(value, columnSizes[x]!, {
					hard: true,
				})
			})
		})
	)

	console.log(table.toString())
}
