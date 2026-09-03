import { appendFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { directories } from '../util/path.js'

// Debug logs always write to a plain text log file, so the terminal
// ui stays clean & the last run stays inspectable after a crash.
// The file lives in the project's .awsless folder, which is only known
// once the app config has been located. Lines written before that wait
// in memory, so a run outside a project leaves no stray folder behind.
let file: string | undefined
let pending: string[] = []

// The log file of the current run, once it has been opened.
export const debugLogFile = () => file

// Called once the project root is known. The file truncates, so it
// only ever holds the current run.
export const openDebugLog = () => {
	if (file) {
		return
	}

	try {
		const path = join(directories.output, 'debug.log')

		mkdirSync(directories.output, { recursive: true })
		writeFileSync(path, pending.join(''))

		pending = []
		file = path
	} catch {
		// Debug logging must never take down the cli.
	}
}

// The dev dashboard taps the debug stream through this sink - set,
// not added, so a config restart never stacks stale listeners.
let sink: ((type: string, message: string) => void) | undefined

export const setDebugSink = (listener?: (type: string, message: string) => void) => {
	sink = listener
}

const write = (type: string, message: string) => {
	const line = `${new Date().toISOString()} [${type}] ${message}\n`

	try {
		if (file) {
			appendFileSync(file, line)
		} else {
			pending.push(line)
		}

		sink?.(type, message)
	} catch {
		// Debug logging must never take down the cli.
	}
}

const format = (parts: unknown[]): string => {
	return parts
		.map(part => {
			if (typeof part === 'string') {
				return part
			}

			if (part instanceof Error) {
				return part.stack ?? part.message
			}

			// Thrown arrays of errors unwrap per entry - stringifying
			// them hides every message behind "[{}]".
			if (Array.isArray(part)) {
				return part.map(entry => format([entry])).join('\n')
			}

			return JSON.stringify(part)
		})
		.join(' ')
}

export const debug = (...parts: unknown[]) => {
	write('debug', format(parts))
}

export const debugError = (error: unknown) => {
	write('error', format([error]))
}
