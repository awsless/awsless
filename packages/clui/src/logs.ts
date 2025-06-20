import { log, intro as p_intro, note as p_note, outro as p_outro, spinner } from '@clack/prompts'
import Table from 'cli-table3'
import { padString, stringLength, subString, wrapString } from './ansi'
import { color } from './colors'
import * as symbol from './symbols'

const endMargin = 3

export const intro = (title = '') => {
	p_intro(subString(title, process.stdout.columns - 6 - endMargin))
}

export const outro = (title = '') => {
	p_outro(subString(title, process.stdout.columns - 6 - endMargin))
}

export const note = (title: string, message: string) => {
	const width = process.stdout.columns - 6 - endMargin
	p_note(
		wrapString(message, width, {
			hard: true,
		}),
		subString(title, width)
	)
}

const logMessage = (symbol: string, message: string) => {
	log.message(
		wrapString(message, process.stdout.columns - 6 - endMargin, {
			hard: true,
			trim: false,
		}),
		{ symbol }
	)
}

export const message = (message: string, symbol: string = color.gray('│')) => logMessage(symbol, message)
export const error = (message: string) => logMessage(color.red(symbol.error), message)
export const info = (message: string) => logMessage(color.blue(symbol.info), message)
export const step = (message: string) => logMessage(color.green(symbol.step), message)
export const warning = (message: string) => logMessage(color.yellow(symbol.warning), message)
export const success = (message: string) => logMessage(color.green(symbol.success), message)

export const list = (title: string, data: Record<string, string>) => {
	const padName = padString(Object.keys(data))

	note(
		title,
		Object.entries(data)
			.map(([name, value]) => {
				return color.reset.whiteBright.bold(padName(name + ':', 2)) + value
			})
			.join('\n')
	)
}

type TaskOptions<T> = {
	initialMessage: string
	errorMessage?: string
	successMessage?: string
	task: (updateMessage: (message: string) => void) => Promise<T>
}

export const task = async <T>(opts: TaskOptions<T>): Promise<T> => {
	let last: string | undefined
	const spin = spinner()
	spin.start(opts.initialMessage)

	const stop = (message?: string, code?: number) => {
		spin.stop(subString(message ?? last ?? opts.initialMessage, process.stdout.columns - 6 - endMargin), code)
	}

	try {
		const result = await opts.task(m => {
			spin.message(subString(m, process.stdout.columns - 6 - endMargin))
			last = m
		})

		stop(opts.successMessage)
		return result
	} catch (error) {
		stop(opts.errorMessage, 2)
		throw error
	}
}

export const table = (props: { head: string[]; body: (string | number | boolean)[][] }) => {
	log.message()

	// const columnWidth = Math.floor((process.stdout.columns - 1) / props.head.length)
	// const width = columnWidth - 6

	const length = Math.max(props.head.length, ...props.body.map(b => b.length))
	const padding = 2
	const totalPadding = padding * 2 * length

	const border = 1
	const totalBorder = (length - 1) * border + 2

	// console.log(totalBorder)

	const windowSize = process.stdout.columns
	const max = windowSize - totalPadding - totalBorder - endMargin
	// const column = Math.floor(max / length)
	// const leftover = Math.floor(max - column * length)

	// console.log(max, column, leftover)

	const contentSizes = Array.from({ length }).map((_, i) => {
		return Math.max(stringLength(props.head[i] ?? ''), ...props.body.map(b => stringLength(String(b[i]))))
	})

	const columnSizes = Array.from({ length }).map(() => {
		return 0
	})

	let leftover = Math.min(
		max,
		contentSizes.reduce((total, size) => total + size, 0)
	)

	while (leftover > 0) {
		for (const x in columnSizes) {
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
					wrapString(value, columnSizes[x]!, {
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

				return wrapString(value, columnSizes[x]!, {
					hard: true,
				})
			})
		})
	)

	console.log(table.toString())
}
