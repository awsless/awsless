import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { MemoryLockBackend, MemoryStateBackend, type Provider, type StateBackend } from '@terraforge/core'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { ExpectedError } from '../src/error'
import { DeployStopped, isStopping, withGracefulStop, withStopGuard } from '../src/util/graceful-stop'
import {
	isNetworkError,
	retryOnNetworkError,
	withLockNetworkRetry,
	withNetworkRetry,
	withStateJournal,
} from '../src/util/network'

type AppState = Parameters<StateBackend['update']>[1]

const offline = () => new Error('creating Security Group\n\ndial tcp: lookup ec2.eu-west-1.amazonaws.com: no such host')

const state = (name: string) => ({ name, stacks: {} }) as unknown as AppState

describe('network errors', () => {
	it('should only match connection failures', () => {
		expect(isNetworkError(offline())).toBe(true)
		expect(isNetworkError(Object.assign(new Error('fetch failed'), { code: 'ECONNRESET' }))).toBe(true)
		expect(isNetworkError(new Error('wrapped', { cause: offline() }))).toBe(true)
		expect(
			isNetworkError(
				Object.assign(new Error('getaddrinfo ENOTFOUND dynamodb.eu-west-1.amazonaws.com'), {
					name: 'DNSException',
					code: 'ENOTFOUND',
				})
			)
		).toBe(true)
		expect(isNetworkError(new Error('AccessDenied: not authorized'))).toBe(false)
		expect(isNetworkError(new Error('Resource "x" already exists'))).toBe(false)
	})

	it('should retry until the connection is back', async () => {
		const fn = vi.fn().mockRejectedValueOnce(offline()).mockResolvedValueOnce('ok')

		await expect(retryOnNetworkError(fn)).resolves.toBe('ok')
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it('should only repeat a mutation that never reached AWS', async () => {
		const reset = Object.assign(new Error('read: connection reset by peer'), { code: 'ECONNRESET' })
		const createResource = vi.fn().mockRejectedValue(reset)
		const getResource = vi.fn().mockRejectedValueOnce(reset).mockResolvedValueOnce({ version: 0, state: {} })
		const provider = withNetworkRetry({
			ownResource: () => true,
			createResource,
			getResource,
		} as unknown as Provider)

		await expect(provider.createResource({} as never)).rejects.toThrow('connection reset')
		await expect(provider.getResource({} as never)).resolves.toEqual({ version: 0, state: {} })

		expect(createResource).toHaveBeenCalledTimes(1)
		expect(getResource).toHaveBeenCalledTimes(2)
	})

	it('should not retry other errors', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('AccessDenied'))

		await expect(retryOnNetworkError(fn)).rejects.toThrow('AccessDenied')
		expect(fn).toHaveBeenCalledTimes(1)
	})
})

describe('state journal', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'awsless-journal-'))
	const file = join(dir, 'app.json')
	const urn = 'urn:app:{test}' as const
	const remote = new MemoryStateBackend()

	afterAll(() => rm(dir, { recursive: true }))

	it('should keep a state that could not be saved', async () => {
		const backend = withStateJournal(
			{
				get: urn => remote.get(urn),
				update: async () => {
					throw new Error('AccessDenied')
				},
				delete: urn => remote.delete(urn),
			},
			() => file
		)

		await backend.get(urn)
		await expect(backend.update(urn, state('unsaved'))).rejects.toThrow('AccessDenied')

		expect(JSON.parse(await readFile(file, 'utf8')).state.name).toBe('unsaved')
	})

	it('should only push the unsaved state when a deploy recovers it', async () => {
		const backend = withStateJournal(remote, () => file)

		await expect(backend.get(urn)).resolves.toBeUndefined()
		await backend.recover(urn)

		await expect(remote.get(urn)).resolves.toMatchObject({ name: 'unsaved' })
		await expect(readFile(file)).rejects.toThrow()
	})

	it('should clear a journal whose save went through', async () => {
		const backend = withStateJournal(
			{
				get: urn => remote.get(urn),
				update: async (urn, state) => {
					await remote.update(urn, state)
					throw new Error('AccessDenied')
				},
				delete: urn => remote.delete(urn),
			},
			() => file
		)

		await backend.get(urn)
		await expect(backend.update(urn, state('applied'))).rejects.toThrow()
		await remote.update(urn, state('applied'))

		await withStateJournal(remote, () => file).recover(urn)

		await expect(readFile(file)).rejects.toThrow()
		await expect(remote.get(urn)).resolves.toMatchObject({ name: 'applied' })
	})

	it('should refuse an unsaved state when the remote moved on', async () => {
		const backend = withStateJournal(
			{
				get: urn => remote.get(urn),
				update: async () => {
					throw new Error('AccessDenied')
				},
				delete: urn => remote.delete(urn),
			},
			() => file
		)

		await backend.get(urn)
		await expect(backend.update(urn, state('stale'))).rejects.toThrow()
		await remote.update(urn, state('newer'))

		await expect(withStateJournal(remote, () => file).recover(urn)).rejects.toThrow(ExpectedError)
		await expect(remote.get(urn)).resolves.toMatchObject({ name: 'newer' })
	})
})

describe('graceful stop', () => {
	it('should finish running operations, refuse new ones & hold the lock after a signal', async () => {
		let finish = () => {}
		const listeners = process.listenerCount('SIGHUP')
		const provider = withStopGuard({
			ownResource: () => true,
			getResource: () => new Promise(resolve => (finish = () => resolve({ version: 0, state: {} }))),
		} as unknown as Provider)

		const lock = withLockNetworkRetry(new MemoryLockBackend())
		const urn = 'urn:app:{test}' as const

		const result = await withGracefulStop(async () => {
			const release = await lock.lock(urn)
			const running = provider.getResource({} as never)

			process.emit('SIGHUP')
			process.exit()

			expect(isStopping()).toBe(true)
			expect(() => provider.getResource({} as never)).toThrow(DeployStopped)

			await release()
			await expect(lock.locked(urn)).resolves.toBe(true)

			finish()
			return running
		})

		await expect(lock.locked(urn)).resolves.toBe(false)

		expect(result).toEqual({ version: 0, state: {} })
		expect(process.listenerCount('SIGHUP')).toBe(listeners)
	})
})
