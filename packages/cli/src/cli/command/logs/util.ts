import { kebabCase } from 'change-case'
import wildstring from 'wildstring'

export type LogLine = {
	level: string
	message: string
	route?: string
	date?: Date
}

export const parseLogLine = (raw: string): LogLine => {
	let json: unknown

	try {
		json = JSON.parse(raw)
	} catch {
		// Raw text lines, like the stdout of a fargate container.
		return { level: 'INFO', message: raw }
	}

	if (typeof json !== 'object' || json === null) {
		return { level: 'INFO', message: String(json) }
	}

	const entry = json as Record<string, unknown>

	// Lambda platform logs (start, report, timeout, out-of-memory)
	if (typeof entry.type === 'string' && entry.type.startsWith('platform') && typeof entry.time === 'string') {
		return {
			level: 'SYSTEM',
			date: new Date(entry.time),
			message: JSON.stringify(entry.record, undefined, 2),
		}
	}

	// Lambda application logs
	if (typeof entry.level === 'string' && typeof entry.timestamp === 'string' && 'message' in entry) {
		const date = new Date(entry.timestamp)

		if (typeof entry.message === 'string') {
			return { level: entry.level, date, message: entry.message }
		}

		// Errors thrown inside the shared bundle carry the route key of
		// the logical resource that was running.
		if (typeof entry.message === 'object' && entry.message !== null) {
			const message = { ...(entry.message as Record<string, unknown>) }
			let route: string | undefined

			if (typeof message.route === 'string') {
				route = message.route
				delete message.route
			}

			return {
				level: entry.level,
				date,
				route,
				message: JSON.stringify(message, undefined, 2),
			}
		}

		return { level: entry.level, date, message: String(entry.message) }
	}

	return { level: 'INFO', message: JSON.stringify(json, undefined, 2) }
}

// Map a log group name like "/aws/lambda/app--stack--function--id" to
// the "stack:function:id" origin of the logical resource.
export const originFromLogGroup = (groupName: string, appName: string) => {
	const name = groupName.split('/').at(-1)!
	const prefix = `${kebabCase(appName)}--`

	if (!name.startsWith(prefix)) {
		return name
	}

	return name.slice(prefix.length).split('--').join(':')
}

export const matchGroups = (origin: string, groups: string[]) => {
	if (groups.length === 0) {
		return true
	}

	return groups.some(group => {
		if (wildstring.match(group, origin)) {
			return true
		}

		// A bare name matches any single segment of the origin,
		// so "bundle" matches "function:bundle" and a stack name
		// matches every group of that stack.
		if (!group.includes(':') && !group.includes('*')) {
			return origin.split(':').includes(group)
		}

		return false
	})
}
