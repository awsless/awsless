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
	return ansiTruncate(value, width, {
		ellipsis,
	})
}

export const pad = (texts: string[]) => {
	const size = Math.max(...texts.map(text => ansiLength(text)))

	return (text: string, padding = 0, fill?: string) => {
		return text.padEnd(size + padding, fill)
	}
}
