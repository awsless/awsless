import { ConfigError } from '../../../error.js'
import * as p from '@clack/prompts'
import { wrap } from '../util.js'
import { color, icon } from '../style.js'

const codeLine = (value: string, level = 0) => {
	return [
		//
		'  '.repeat(level),
		value,
	].join('')
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

export const logConfigError = (error: ConfigError) => {
	for (const issue of error.error.errors) {
		const message = [color.error(issue.message), color.dim(error.file), '\n{']
		let context = error.data

		const inStack = issue.path[0] === 'stacks' && typeof issue.path[1] === 'number'
		const length = issue.path.length
		const end: string[] = ['}']

		issue.path.forEach((path, i) => {
			const index = i + 1
			context = context[path]

			if (typeof path === 'string') {
				const key = path + `: `
				if (index === length) {
					const space = ' '.repeat(key.length)
					const value = format(context)
					const error = icon.arrow.top.repeat(value.length)

					message.push(codeLine(key + color.warning(value), index))
					message.push(codeLine(space + color.error(error), index))
				} else if (Array.isArray(context)) {
					message.push(codeLine(key + '[', index))
					end.unshift(codeLine(']', index))
				} else if (typeof context === 'object') {
					if (inStack && index === 3) {
						const name = error.data.stacks[issue.path[1]!].name
						message.push(codeLine('name: ' + color.info(`"${name}"`) + ',', index))
					}
					message.push(codeLine(key + '{', index))
					end.unshift(codeLine('}', index))
				}
			} else if (typeof context === 'object') {
				message.push(codeLine('{', index))
				end.unshift(codeLine('}', index))
			} else if (typeof context === 'string') {
				message.push(codeLine(color.warning(`"${context}"`), index))

				const error = icon.arrow.top.repeat(context.length + 2)
				message.push(codeLine(color.error(error), index))
			}
		})

		p.log.message(
			wrap([...message, ...end], {
				trim: false,
			}),
			{
				symbol: color.error`×`,
			}
		)
	}
}
