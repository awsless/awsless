import { describe, expect, it, vi } from 'vitest'
import { createServerPool } from '../src/dev/pool'

const entry = (value: string) => {
	const stop = vi.fn()

	return { boot: vi.fn(async () => ({ value, stop })), stop }
}

describe('dev server pool', () => {
	it('should reuse a server while its fingerprint matches', async () => {
		const pool = createServerPool()
		const first = entry('one')
		const second = entry('two')

		await expect(pool.keep('db', { port: 1 }, first.boot)).resolves.toBe('one')
		await expect(pool.keep('db', { port: 1 }, second.boot)).resolves.toBe('one')

		expect(second.boot).not.toHaveBeenCalled()
		expect(pool.peek('db')).toBe('one')
	})

	it('should stop the old server before booting a changed one', async () => {
		const pool = createServerPool()
		const first = entry('one')
		const second = entry('two')

		await pool.keep('db', { port: 1 }, first.boot)
		await expect(pool.keep('db', { port: 2 }, second.boot)).resolves.toBe('two')

		expect(first.stop).toHaveBeenCalledTimes(1)
		expect(first.stop.mock.invocationCallOrder[0]).toBeLessThan(second.boot.mock.invocationCallOrder[0]!)
		expect(pool.peek('db')).toBe('two')
	})

	it('should sweep everything a run did not claim', async () => {
		const pool = createServerPool()
		const kept = entry('kept')
		const retained = entry('retained')
		const dropped = entry('dropped')

		pool.begin()
		await pool.keep('kept', null, kept.boot)
		await pool.keep('retained', null, retained.boot)
		await pool.keep('dropped', null, dropped.boot)

		// The next run only claims two of the three.
		pool.begin()
		await pool.keep('kept', null, entry('ignored').boot)
		pool.retain('retained')
		await pool.sweep()

		expect(dropped.stop).toHaveBeenCalledTimes(1)
		expect(kept.stop).not.toHaveBeenCalled()
		expect(retained.stop).not.toHaveBeenCalled()
		expect(pool.peek('dropped')).toBeUndefined()
		expect(pool.peek('retained')).toBe('retained')
	})

	it('should stop everything in reverse boot order', async () => {
		const pool = createServerPool()
		const first = entry('first')
		const second = entry('second')

		await pool.keep('first', null, first.boot)
		await pool.keep('second', null, second.boot)
		await pool.stopAll()

		expect(second.stop.mock.invocationCallOrder[0]).toBeLessThan(first.stop.mock.invocationCallOrder[0]!)
		expect(pool.peek('first')).toBeUndefined()
		expect(pool.peek('second')).toBeUndefined()
	})
})
