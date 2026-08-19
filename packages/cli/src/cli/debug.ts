import { appendFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { directories } from '../util/path.js'

// Debug logs always write to a plain text log file, so the terminal
// ui stays clean & the last run stays inspectable after a crash. The
// file truncates at the start of every run.
export const debugLogFile = join(directories.output, 'debug.log')

let ready = false

// Called at the start of every cli run, so the file only ever holds
// the current run.
export const clearDebugLog = () => {
	try {
		mkdirSync(directories.output, { recursive: true })
		writeFileSync(debugLogFile, '')
		ready = true
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
	try {
		if (!ready) {
			clearDebugLog()
		}

		appendFileSync(debugLogFile, `${new Date().toISOString()} [${type}] ${message}\n`)
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
