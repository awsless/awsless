import ansiTruncate from 'ansi-truncate'
import ansiLength from 'string-length'
import ansiWrap, { Options } from 'wrap-ansi'
import { ellipsis } from './symbols'

export const wrap = (value: string, width: number, options?: Options) => {
	return ansiWrap(value, width, options)
}

export const length = (value: string) => {
	return ansiLength(value)
}

export const truncate = (value: string, width: number): string => {
	// ansi-truncate counts the total width across newlines, so a
	// multi-line value must be truncated one line at a time.
	return value
		.split('\n')
		.map(line =>
			ansiTruncate(line, width, {
				ellipsis,
			})
		)
		.join('\n')
}

export const pad = (texts: string[]) => {
	const size = Math.max(...texts.map(text => ansiLength(text)))

	return (text: string, padding = 0, fill?: string) => {
		return text.padEnd(size + padding, fill)
	}
}
