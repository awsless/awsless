// Heavy local servers survive dev environment restarts: a config
// change only reboots the servers whose own config changed, while the
// cheap parts (bundle worker, routers, dashboard) restart every time.
type PoolEntry = {
	fingerprint: string
	value: unknown
	stop: () => void | Promise<void>
}

export type ServerPool = {
	// Boot a server or reuse the running one when the fingerprint still
	// matches. A changed fingerprint stops the old server first.
	keep<T>(
		key: string,
		fingerprint: unknown,
		boot: () => Promise<{ value: T; stop: () => void | Promise<void> }>
	): Promise<T>

	// Mark a key as still in use this run, for servers that only boot
	// later during the start phase.
	retain(key: string): void

	// The running value of a key, when it survived from a previous run.
	peek<T>(key: string): T | undefined

	// Start a new run: claims reset, so the following sweep only sees
	// this run's claims.
	begin(): void

	// Stop every server that wasn't claimed this run - its resource
	// disappeared from the config.
	sweep(): Promise<void>

	stopAll(): Promise<void>
}

export const createServerPool = (): ServerPool => {
	const entries = new Map<string, PoolEntry>()
	const claimed = new Set<string>()

	return {
		async keep(key, fingerprint, boot) {
			const print = JSON.stringify(fingerprint ?? null)

			claimed.add(key)

			const existing = entries.get(key)

			if (existing) {
				if (existing.fingerprint === print) {
					return existing.value as never
				}

				entries.delete(key)
				await existing.stop()
			}

			const fresh = await boot()

			entries.set(key, { fingerprint: print, value: fresh.value, stop: fresh.stop })

			return fresh.value
		},
		retain(key) {
			claimed.add(key)
		},
		peek(key) {
			return entries.get(key)?.value as never
		},
		begin() {
			claimed.clear()
		},
		async sweep() {
			for (const [key, entry] of [...entries]) {
				if (!claimed.has(key)) {
					entries.delete(key)
					await entry.stop()
				}
			}
		},
		async stopAll() {
			claimed.clear()

			for (const [key, entry] of [...entries].reverse()) {
				entries.delete(key)
				await entry.stop()
			}
		},
	}
}
