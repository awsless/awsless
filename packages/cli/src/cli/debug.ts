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
	} catch (_) {
		// Debug logging must never take down the cli.
	}
}

const write = (type: string, message: string) => {
	try {
		if (!ready) {
			clearDebugLog()
		}

		appendFileSync(debugLogFile, `${new Date().toISOString()} [${type}] ${message}\n`)
	} catch (_) {
		// Debug logging must never take down the cli.
	}
}

const format = (parts: unknown[]) => {
	return parts
		.map(part => {
			if (typeof part === 'string') {
				return part
			}

			if (part instanceof Error) {
				return part.stack ?? part.message
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
