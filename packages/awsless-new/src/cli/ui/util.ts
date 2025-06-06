import { spinner } from '@clack/prompts'
import { capitalCase } from 'change-case'
import Table from 'cli-table3'
import wrapAnsi, { Options } from 'wrap-ansi'
import { char, color } from './style.js'

export const wrap = (lines: string | string[], options?: Options) => {
	return wrapAnsi(typeof lines === 'string' ? lines : lines.join('\n'), process.stdout.columns - 8, options)
}

// export const multiline = (...lines: string[]) => {
// 	return wrapAnsi(text, process.stdout.columns - 8)
// }

// export const relPath = (path: string) => {}

export const padText = (texts: string[]) => {
	const size = Math.max(...texts.map(text => text.length))

	return (text: string, padding = 0, fill?: string) => {
		return text.padEnd(size + padding, fill)
	}
}

export const task = async <T>(message: string, cb: (update: (message: string) => void) => Promise<T>): Promise<T> => {
	let last = message
	const spin = spinner()
	spin.start(last)

	try {
		const result = await cb(m => {
			spin.message(m.substring(0, process.stdout.columns - 8))
			last = m
		})

		spin.stop(last)
		return result
	} catch (error) {
		spin.stop('Failed.', 2)
		throw error
	}
}

export const list = (data: Record<string, string>) => {
	const padName = padText(Object.keys(data))

	return Object.entries(data)
		.map(([name, value]) => [color.label(padName(name + ':', 2)), value].join(''))
		.join(char.br)
}

export const line = (message: string) => {
	console.log(color.line('│ '), message)
}

export const table = (props: { head: string[]; body: (string | number | boolean)[][] }) => {
	console.log(color.line('│'))

	const table = new Table({
		// wordWrap: true,
		// wrapOnWordBoundary: false,
		// truncate: '...',
		// colWidths: props.colWidths,

		// head: props.head.map(h => color.label(capitalCase(h))),
		head: props.head.map(h => '\n' + color.label(capitalCase(h))),
		// colWidths: [100, 200],
		style: {
			'padding-left': 2,
			'padding-right': 2,
		},
		chars: {
			'bottom-right': '╯',
			'top-right': '╮',
			'top-left': '├',
			'bottom-left': '├',
			// mid: '',
			// 'mid-mid': '',
			// 'left-mid': '',
			// 'right-mid': '',
		},
	})

	table.push(
		...props.body.map(row =>
			row.map(v => {
				if (typeof v === 'boolean') {
					return v ? color.success('yes') : color.error('no')
				}

				return v
			})
		)
	)
	// table.push(props.head.map(() => ''))

	return table.toString()
}
