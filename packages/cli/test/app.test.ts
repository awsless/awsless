import { describe, expect, it, vi } from 'vitest'
import { createChannel } from '../src/app'
import { createTestApp } from './_kit'

describe('app channel', () => {
	it('should hold values back until the channel opens', () => {
		const channel = createChannel<[string]>()
		const listener = vi.fn()

		channel.listen(listener)
		channel.add('a')

		expect(listener).not.toHaveBeenCalled()

		channel.open()

		expect(listener.mock.calls).toEqual([['a']])
	})

	it('should replay every value to a listener that registers late', () => {
		const channel = createChannel<[string]>()
		const listener = vi.fn()

		channel.add('a')
		channel.open()
		channel.add('b')
		channel.listen(listener)

		expect(listener.mock.calls).toEqual([['a'], ['b']])
	})

	it('should deliver a value added during the replay exactly once', () => {
		const channel = createChannel<[string]>()
		const first = vi.fn((value: string) => {
			if (value === 'a') {
				channel.add('b')
			}
		})
		const second = vi.fn()

		channel.listen(first)
		channel.listen(second)
		channel.add('a')
		channel.open()

		expect(first.mock.calls).toEqual([['a'], ['b']])
		expect(second.mock.calls.map(([value]) => value).toSorted((a, b) => a.localeCompare(b))).toEqual(['a', 'b'])
	})
})

describe('app ready', () => {
	it('should only become ready once', () => {
		const { ready } = createTestApp()

		ready()

		expect(() => ready()).toThrow('already ready')
	})
})
