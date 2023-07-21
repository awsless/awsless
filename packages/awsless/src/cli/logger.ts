import { style } from "./style.js"

const queue:{
	date: Date
	// color: string
	type: string
	message: string
}[] = []

export const debugError = (error:unknown) => {
	queue.push({
		date: new Date(),
		type: style.error.dim('error'),
		// color: 'red',
		// type: 'error',
		message: (
			typeof error === 'string'
			? error
			: error instanceof Error
			? style.error(error.message || '')
			: JSON.stringify(error)
		)
	})
}

export const debug = (...parts:unknown[]) => {
	queue.push({
		date: new Date(),
		type: style.warning.dim('debug'),
		// color: 'yellow',
		// type: 'debug',
		message: parts.map(part => typeof part === 'string' ? part : JSON.stringify(part)).join(' '),
	})
}

export const flushDebug = () => {
	return queue.splice(0, queue.length)
}
