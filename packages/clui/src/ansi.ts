// @ts-ignore
import ansiSubstring from 'ansi-substring'
import stringLength from 'string-length'
import wrapAnsi, { Options } from 'wrap-ansi'

export { stringLength }

export const wrapString = (lines: string | string[], width: number, options?: Options) => {
	return wrapAnsi(typeof lines === 'string' ? lines : lines.join('\n'), width, options)
}

export const subString = (message: string, width: number) => {
	const length = stringLength(message)

	if (length > width - 1) {
		return ansiSubstring(message, 0, width - 1) + '…'
	}

	return ansiSubstring(message, 0, width)
}

export const padString = (texts: string[]) => {
	const size = Math.max(...texts.map(text => stringLength(text)))

	return (text: string, padding = 0, fill?: string) => {
		return text.padEnd(size + padding, fill)
	}
}

// export const list = (data: Record<string, string>) => {
// 	const padName = padText(Object.keys(data))

// 	return Object.entries(data)
// 		.map(([name, value]) => [color.label(padName(name + ':', 2)), value].join(''))
// 		.join(char.br)
// }

// export const line = (message: string) => {
// 	console.log(color.line('│ '), message)
// }

// export const table = (props: { head: string[]; body: (string | number | boolean)[][] }) => {
// 	console.log(color.line('│'))

// 	const table = new Table({
// 		// wordWrap: true,
// 		// wrapOnWordBoundary: false,
// 		// truncate: '...',
// 		// colWidths: props.colWidths,

// 		// head: props.head.map(h => color.label(capitalCase(h))),
// 		head: props.head.map(h => '\n' + color.label(capitalCase(h))),
// 		// colWidths: [100, 200],
// 		style: {
// 			'padding-left': 2,
// 			'padding-right': 2,
// 		},
// 		chars: {
// 			'bottom-right': '╯',
// 			'top-right': '╮',
// 			'top-left': '├',
// 			'bottom-left': '├',
// 			// mid: '',
// 			// 'mid-mid': '',
// 			// 'left-mid': '',
// 			// 'right-mid': '',
// 		},
// 	})

// 	table.push(
// 		...props.body.map(row =>
// 			row.map(v => {
// 				if (typeof v === 'boolean') {
// 					return v ? color.success('yes') : color.error('no')
// 				}

// 				return v
// 			})
// 		)
// 	)
// 	// table.push(props.head.map(() => ''))

// 	return table.toString()
// }
