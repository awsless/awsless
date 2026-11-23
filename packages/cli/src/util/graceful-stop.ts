import { log } from '@awsless/clui'
import type { Provider } from '@terraforge/core'

const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const

let stopping = false
let active = false
const deferred: (() => Promise<void>)[] = []

export const isStopping = () => stopping

// The engine releases its lock on a signal, while the deploy still runs
// until the state is saved.
export const deferWhileStopping = async (fn: () => Promise<void>) => {
	if (active && stopping) {
		deferred.push(fn)
	} else {
		await fn()
	}
}

export class DeployStopped extends Error {
	constructor() {
		super('The deploy is stopping, so no new operations start.')
	}
}

// Operations already running finish, new ones fail right away so the
// engine reaches its final state save quickly.
export const withStopGuard = (provider: Provider): Provider => {
	return new Proxy(provider, {
		get(target, key, receiver) {
			const value = Reflect.get(target, key, receiver)

			if (typeof value !== 'function' || key === 'ownResource' || key === 'destroy') {
				return value
			}

			return (...args: unknown[]) => {
				if (stopping) {
					throw new DeployStopped()
				}

				return value.apply(target, args)
			}
		},
	})
}

// Killing a deploy mid-flight leaves resources in AWS the state doesn't
// know about, so a signal or a dropped terminal only stops new operations
// from starting. The process exits once the running ones finished & the
// state is saved. A third signal still forces the exit.
export const withGracefulStop = async <T>(fn: () => Promise<T>) => {
	// Restored as is, so it stays unbound.
	// oxlint-disable-next-line typescript/unbound-method
	const exit = process.exit
	let signals = 0

	const stop = () => {
		if (!stopping) {
			stopping = true
			log.warning(
				'Stopping once the running operations finish & the state is saved. Press Ctrl-C twice more to force.'
			)
		}
	}

	const onSignal = () => {
		signals++
		stop()

		if (signals >= 3) {
			exit(1)
		}
	}

	// A hung up terminal throws on every write.
	const ignore = () => {}

	// The terraform engine saves its state on exit, and then calls this.
	process.exit = (() => stop()) as typeof process.exit

	for (const signal of SIGNALS) {
		process.on(signal, onSignal)
	}

	process.stdout.on('error', ignore)
	process.stderr.on('error', ignore)

	active = true

	try {
		return await fn()
	} finally {
		active = false
		process.exit = exit

		for (const signal of SIGNALS) {
			process.off(signal, onSignal)
		}

		process.stdout.off('error', ignore)
		process.stderr.off('error', ignore)

		for (const cb of deferred.splice(0)) {
			await cb()
		}
	}
}
