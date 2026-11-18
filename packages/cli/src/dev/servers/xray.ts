import { createSocket } from 'node:dgram'

// One span as the dashboard shows it, nested under the dispatch it ran in.
export type DevSpan = {
	trace: string
	id: string
	parent?: string
	name: string
	namespace?: string
	start: number
	ms: number
	ok: boolean
	status?: number
	errorType?: string
	operation?: string
}

// The dispatch ids are 8 hex chars; X-Ray wants a 24 char root and a 16 char
// parent, so they're padded with zeros and read back by their tail.
export const toXRayHeader = (trace: { traceId: string; spanId: string }) => {
	const time = Math.floor(Date.now() / 1000).toString(16)

	return `Root=1-${time}-${trace.traceId.padStart(24, '0')};Parent=${trace.spanId.padStart(16, '0')};Sampled=1`
}

const fromPadded = (value: string) => value.replace(/^0{8}/, '')

export const toDevSpan = (segment: Record<string, any>): DevSpan | undefined => {
	if (typeof segment.trace_id !== 'string' || typeof segment.id !== 'string') {
		return
	}

	const status = segment.http?.response?.status

	return {
		trace: (segment.trace_id.split('-')[2] ?? '').slice(-8),
		id: segment.id,
		parent: typeof segment.parent_id === 'string' ? fromPadded(segment.parent_id) : undefined,
		name: String(segment.name),
		namespace: segment.namespace,
		start: Math.round(segment.start_time * 1000),
		ms: Math.round((segment.end_time - segment.start_time) * 1000),
		ok: !segment.error && !segment.fault,
		...(typeof status === 'number' ? { status } : {}),
		...(segment.cause?.exceptions?.[0]?.type ? { errorType: segment.cause.exceptions[0].type } : {}),
		...(segment.aws?.operation ? { operation: String(segment.aws.operation) } : {}),
	}
}

// Stands in for the X-Ray daemon a traced Lambda sends its spans to.
export const createXRayServer = (props: { onSpan: (span: DevSpan) => void }) => {
	const socket = createSocket('udp4')

	socket.on('message', message => {
		try {
			// A header line, then the segment.
			const span = toDevSpan(JSON.parse(message.toString().split('\n')[1] ?? ''))

			if (span) {
				props.onSpan(span)
			}
		} catch {}
	})

	return {
		async listen() {
			await new Promise<void>(resolve => socket.bind(0, '127.0.0.1', resolve))

			return socket.address().port
		},
		stop() {
			socket.close()
		},
	}
}
