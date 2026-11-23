import { createHash } from 'crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { dirname } from 'path'
import { setTimeout } from 'timers/promises'
import type { LockBackend, Provider, StateBackend, URN } from '@terraforge/core'
import { debug } from '../cli/debug.js'
import { ExpectedError } from '../error.js'
import { deferWhileStopping } from './graceful-stop.js'

// Go errors from the terraform providers & node / bun socket errors.
const NETWORK_ERROR =
	/no such host|dial tcp|connection reset|connection refused|network is unreachable|i\/o timeout|TLS handshake timeout|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH|EPIPE|socket hang up|ConnectionRefused|ConnectionClosed|FailedToOpenSocket|Unable to connect/

// Failures before the request left the machine, so AWS never saw it.
const UNSENT_ERROR =
	/no such host|dial tcp|connection refused|network is unreachable|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|ConnectionRefused|FailedToOpenSocket|Unable to connect/

const matches = (pattern: RegExp, error: unknown): boolean => {
	if (!(error instanceof Error)) {
		return false
	}

	const code = 'code' in error ? String(error.code) : ''

	return pattern.test(`${error.name} ${code} ${error.message}`) || matches(pattern, error.cause)
}

export const isNetworkError = (error: unknown) => matches(NETWORK_ERROR, error)
export const isUnsentError = (error: unknown) => matches(UNSENT_ERROR, error)

// Stays under the 5 minute lease of the deploy lock, which can't renew
// while offline.
const RETRY_TIMEOUT = 4 * 60_000

export const retryOnNetworkError = async <T>(fn: () => Promise<T>, retryable = isNetworkError) => {
	const deadline = Date.now() + RETRY_TIMEOUT
	let delay = 1000

	while (true) {
		try {
			return await fn()
		} catch (error) {
			if (!retryable(error) || Date.now() + delay > deadline) {
				throw error
			}

			debug('Network error, retrying in', delay, 'ms:', error)
			await setTimeout(delay)
			delay = Math.min(delay * 2, 30_000)
		}
	}
}

const MUTATIONS = new Set<PropertyKey>(['createResource', 'updateResource', 'deleteResource'])

// A mutation whose response got lost might have gone through, so only
// one that never reached AWS is repeated.
export const withNetworkRetry = (provider: Provider): Provider => {
	return new Proxy(provider, {
		get(target, key, receiver) {
			const value = Reflect.get(target, key, receiver)

			if (typeof value !== 'function' || key === 'ownResource' || key === 'destroy') {
				return value
			}

			const retryable = MUTATIONS.has(key) ? isUnsentError : isNetworkError

			return (...args: unknown[]) => retryOnNetworkError(() => value.apply(target, args), retryable)
		},
	})
}

export const withLockNetworkRetry = (backend: LockBackend): LockBackend => {
	return {
		// Unconditional, so a repeat could remove a lock someone took since.
		insecureReleaseLock: urn => backend.insecureReleaseLock(urn),
		locked: urn => retryOnNetworkError(() => backend.locked(urn)),
		async lock(urn) {
			const release = await retryOnNetworkError(() => backend.lock(urn))
			return () => deferWhileStopping(() => retryOnNetworkError(release))
		},
	}
}

type AppState = Parameters<StateBackend['update']>[1]

type Journal = {
	base: string
	state: AppState
}

const hashState = (state: AppState | undefined) => {
	return createHash('sha1')
		.update(JSON.stringify(state ?? null))
		.digest('hex')
}

// Every state save lands in a local journal first, so a save that can't
// reach S3 (like on exit after the connection dropped) doesn't orphan the
// resources it holds. The next deploy recovers it, unless the remote state
// moved on since the journal was written.
export const withStateJournal = (backend: StateBackend, journalFile: (urn: URN) => string) => {
	const synced = new Map<URN, string>()

	// The engine's exit handler can save while the deploy itself still
	// saves, and the last write must win.
	let queue: Promise<unknown> = Promise.resolve()
	const serial = <T>(fn: () => Promise<T>) => {
		const next = queue.then(fn, fn)
		queue = next.catch(() => {})
		return next
	}

	const push = async (urn: URN, state: AppState) => {
		await retryOnNetworkError(() => backend.update(urn, state))
		synced.set(urn, hashState(state))
		await rm(journalFile(urn), { force: true })
	}

	return {
		async get(urn: URN) {
			const remote = await retryOnNetworkError(() => backend.get(urn))
			synced.set(urn, hashState(remote))
			return remote
		},
		update(urn: URN, state: AppState) {
			return serial(async () => {
				const base = synced.get(urn)

				if (base) {
					const file = journalFile(urn)
					const journal: Journal = { base, state }

					// A forced exit mid write must not truncate the only copy.
					await mkdir(dirname(file), { recursive: true })
					await writeFile(`${file}.tmp`, JSON.stringify(journal), { mode: 0o600 })
					await rename(`${file}.tmp`, file)
				}

				await push(urn, state)
			})
		},
		delete(urn: URN) {
			return serial(async () => {
				await retryOnNetworkError(() => backend.delete(urn))
				synced.set(urn, hashState(undefined))
				await rm(journalFile(urn), { force: true })
			})
		},
		// Only safe while holding the deploy lock, or a newer deploy's
		// state could be overwritten.
		async recover(urn: URN) {
			const file = journalFile(urn)
			let journal: Journal

			try {
				journal = JSON.parse(await readFile(file, 'utf8'))
			} catch (error) {
				if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
					return
				}

				throw error
			}

			const remote = hashState(await retryOnNetworkError(() => backend.get(urn)))

			// The save went through, only the cleanup didn't.
			if (remote === hashState(journal.state)) {
				await rm(file, { force: true })
				return
			}

			if (journal.base !== remote) {
				throw new ExpectedError(
					`An earlier deploy couldn't save its state, and the remote state changed since. ` +
						`Compare the unsaved state in ${file} with "awsless state pull", then delete that file.`
				)
			}

			debug('Pushing the unsaved state from', file)
			await push(urn, journal.state)
		},
	}
}
