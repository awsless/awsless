import { spinner } from '@clack/prompts'
import wrapAnsi, { Options } from 'wrap-ansi'

export const wrap = (lines: string | string[], options?: Options) => {
	return wrapAnsi(typeof lines === 'string' ? lines : lines.join('\n'), process.stdout.columns - 8, options)
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
		spin.error('Failed.')
		throw error
	}
}

// Deploys run for minutes, so longer runs read as "2m 14s".
export const formatElapsed = (start: number) => {
	const ms = Math.round(performance.now() - start)

	if (ms < 1000) {
		return `${ms}ms`
	}

	if (ms < 60_000) {
		return `${(ms / 1000).toFixed(1)}s`
	}

	return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}
