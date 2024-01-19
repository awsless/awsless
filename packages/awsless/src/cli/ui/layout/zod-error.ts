import { Terminal } from '../../lib/terminal.js'
import { br } from './basic.js'
import { style, symbol } from '../../style.js'
import { dialog } from './dialog.js'
import { ConfigError } from '../../../config/load.js'

const line = (value: string, level = 0, highlight = false) => {
	return [
		highlight ? style.error(symbol.pointerSmall) + style.placeholder(' | ') : style.placeholder.dim('  | '),
		'  '.repeat(level),
		value,
		br(),
	]
}

const format = (value: unknown): string => {
	if (Array.isArray(value)) {
		return '[ ... ]'
	}

	if (value === null) {
		return 'null'
	}

	switch (typeof value) {
		case 'function':
			return '() => { ... }'
		case 'bigint':
			return `${value}n`
		case 'symbol':
			return 'Symbol()'
		case 'object':
			return '{ ... }'
		case 'undefined':
			return 'undefined'
		case 'string':
		case 'number':
		case 'boolean':
			return JSON.stringify(value)
	}

	return ''
}

export const zodError = (error: ConfigError) => {
	return (term: Terminal) => {
		// term.out.write(JSON.stringify(error.errors))
		for (const issue of error.error.issues) {
			term.out.gap()
			term.out.write(dialog('error', [style.error(issue.message)]))
			term.out.write('  ' + style.placeholder(error.file))

			term.out.gap()
			term.out.write(line('{'))

			let context = error.data

			const inStack = issue.path[0] === 'stacks' && typeof issue.path[1] === 'number'
			const length = issue.path.length
			const end: string[][] = []

			issue.path.forEach((path, i) => {
				const index = i + 1
				context = context[path]

				if (typeof path === 'string') {
					const key = path + `: `
					if (index === length) {
						const space = ' '.repeat(key.length)
						const value = format(context)
						const error = '^'.repeat(value.length)

						term.out.write(line(key + style.warning(value), index))
						term.out.write(line(space + style.error(error), index, true))
					} else if (Array.isArray(context)) {
						term.out.write(line(key + '[', index))
						end.unshift(line(']', index))
					} else if (typeof context === 'object') {
						if (inStack && index === 3) {
							const name = error.data.stacks[issue.path[1]].name
							term.out.write(line('name: ' + style.info(`"${name}"`) + ',', index))
						}

						term.out.write(line(key + '{', index))
						end.unshift(line('}', index))
					}
				} else if (typeof context === 'object') {
					term.out.write(line('{', index))
					end.unshift(line('}', index))
				}
			})

			term.out.write(end)
			term.out.write(line('}'))
			term.out.gap()
		}
	}
}
