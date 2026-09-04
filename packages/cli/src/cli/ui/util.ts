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
