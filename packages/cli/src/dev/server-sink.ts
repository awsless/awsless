import type { DevContext } from '../feature.js'

// Where a local server kept across dev restarts reports: the current run's
// health & log, the last lines of its log for the next run, and whether it
// died without being asked to.
export type ServerSink = {
	health?: (status: 'up' | 'down', detail?: string) => void
	log?: (line: string) => void
	tail: string[]
	crashed?: string
	onExit: (code: number | null, signal: string | null) => void
	onOutput: (line: string) => void
}

const TAIL_LINES = 20

export const createServerSink = (): ServerSink => {
	const sink: ServerSink = {
		tail: [],
		onExit(code, signal) {
			sink.crashed = code !== null ? `exited with code ${code}` : `killed by ${signal}`
			sink.health?.('down', sink.crashed)
		},
		onOutput(line) {
			sink.tail.push(line)

			while (sink.tail.length > TAIL_LINES) {
				sink.tail.shift()
			}

			sink.log?.(line)
		},
	}

	return sink
}

// Points a kept server's health & log at this run, and replays its tail
// into the run's event bus. A crash while no run listened still shows.
export const connectServerSink = (ctx: DevContext, name: string, sink: ServerSink) => {
	sink.health = (status, detail) => ctx.reportHealth(name, status, detail)
	sink.health(sink.crashed ? 'down' : 'up', sink.crashed)
	sink.log = line => ctx.emitEvent(name, { date: Date.now(), line })

	for (const line of sink.tail) {
		sink.log(line)
	}
}
