import { createSocket } from 'node:dgram'
import type { Mock } from 'vitest'
import { flushTraces, resetTraceFailureLog } from './trace'

export type Func = (...args: any[]) => any
export type Result<T extends Record<string, Func>> = { [K in keyof T]: Mock<T[K]> }
type Vitest = (typeof import('vitest'))['vi']
type MockFactory = Vitest['fn']

export const getVitest = (provided?: Vitest) => {
	const vi = provided ?? (globalThis as { vi?: Vitest }).vi

	if (!vi) {
		throw new Error('Enable vitest globals or pass vi explicitly (vi.fn for mockFn and mockObjectValues).')
	}

	return vi
}

export const mockObjectValues = <T extends Record<string, Func>>(object: T, createMock?: MockFactory): Result<T> => {
	const list: Record<string, Mock<Func>> = {}

	for (const [key, value] of Object.entries(object)) {
		list[key] = mockFn(value, createMock)
	}

	return Object.freeze(list) as Result<T>
}

export const mockFn = <T extends Func>(fn: T, createMock?: MockFactory) => {
	const factory = createMock ?? getVitest().fn
	return factory(fn)
}

export const nextTick = async (fn: Func, ...args: unknown[]): Promise<unknown> => {
	await new Promise(resolve => setTimeout(resolve, 0))
	return fn(...args)
}

// The trace a mocked invocation runs in: its root and the Lambda segment the spans hang under.
export const TRACE_ROOT = '1-5759e988-bd862e3fe1be46a994272793'
export const TRACE_PARENT = '53995c3f42cd8ad8'

// A UDP socket in the X-Ray daemon's place, collecting the spans the code
// sends, with tracing turned on for the test: the app's switch, the daemon's
// address and a sampled trace header. `close()` turns it off again.
export const mockTraceDaemon = async (provided?: Vitest) => {
	const vi = getVitest(provided)
	const socket = createSocket('udp4')
	const segments: Record<string, any>[] = []

	socket.on('message', message => {
		segments.push(JSON.parse(message.toString().split('\n')[1]!))
	})

	await new Promise<void>(resolve => socket.bind(0, '127.0.0.1', resolve))

	vi.stubEnv('AWSLESS_TRACING', 'true')
	vi.stubEnv('AWS_XRAY_DAEMON_ADDRESS', `127.0.0.1:${socket.address().port}`)
	vi.stubEnv('_X_AMZN_TRACE_ID', `Root=${TRACE_ROOT};Parent=${TRACE_PARENT};Sampled=1`)

	return {
		segments,
		// UDP arrives async: the spans once this many came in.
		async received(count: number) {
			await flushTraces()
			await vi.waitFor(() => {
				if (segments.length < count) {
					throw new Error(`${segments.length} of ${count} spans arrived`)
				}
			})

			return segments
		},
		close() {
			vi.stubEnv('AWSLESS_TRACING', '')
			socket.close()
			resetTraceFailureLog()
		},
	}
}
