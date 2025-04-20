// @ts-ignore
import asyncOnExit from 'async-on-exit'

const listeners = new Set<() => void>()
let listening = false

export const onExit = (cb: () => Promise<void>) => {
	listeners.add(cb)

	if (!listening) {
		listening = true
		asyncOnExit(async () => {
			await Promise.allSettled([...listeners].map(cb => cb()))
		}, true)
	}

	return () => {
		listeners.delete(cb)

		if (listeners.size === 0) {
			listening = false
			asyncOnExit.dispose()
		}
	}
}
