
import { WeakCache } from '../src'
// @ts-ignore
import gc from 'expose-gc'

const sleep = () => new Promise(resolve => setTimeout(resolve, 10))

const runGC = async () => {
	await sleep()
	await gc()
	await sleep()
}

describe('Weak Cache', () => {

	it('should set & has & get cache item', () => {
		const cache = new WeakCache<string, string>()
		cache.set('test', 'value')

		expect(cache.has('test')).toBe(true)
		expect(cache.get('test')).toBe('value')
	})

	it('should handle undefined entries', () => {
		const cache = new WeakCache<string, string>()
		expect(cache.has('unknown')).toBe(false)
		expect(cache.get('unknown')).toBe(undefined)
	})

	it('should handle default value', () => {
		const cache = new WeakCache<string, string>()
		expect(cache.get('unknown', 'defaulted')).toBe('defaulted')
	})

	it('should return cache size', () => {
		const cache = new WeakCache<number, number>()
		cache.set(1, 1)
		expect(cache.size).toBe(1)
	})

	it('should delete cache item', () => {
		const cache = new WeakCache<number, number>()
		cache.set(1, 1)
		cache.delete(1)
		expect(cache.size).toBe(0)
	})

	it('should clear cache', () => {
		const cache = new WeakCache<number, number>()
		cache.set(1, 1)
		cache.set(2, 1)
		cache.set(3, 1)
		cache.clear()
		expect(cache.size).toBe(0)
	})

	it('should be iterable', () => {
		const limit = 10
		const cache = new WeakCache<number, string>()
		Array.from({ length: limit }).forEach((_, key) => {
			cache.set(key, String(Math.random()))
		})

		expect(cache.size).toBe(limit)

		let count = 0

		for(const [key, value] of cache) {
			count++
			expect(key).toStrictEqual(expect.any(Number))
			expect(value).toStrictEqual(expect.any(String))
		}

		for(const [key, value] of cache.entries()) {
			count++
			expect(key).toStrictEqual(expect.any(Number))
			expect(value).toStrictEqual(expect.any(String))
		}

		for(const key of cache.keys()) {
			count++
			expect(key).toStrictEqual(expect.any(Number))
		}

		for(const value of cache.values()) {
			count++
			expect(value).toStrictEqual(expect.any(String))
		}

		expect(count).toBe(limit * 4)
	})

	it('should clean up when garbage collection runs', async () => {
		const limit = 10000
		const cache = new WeakCache<number, number>()

		Array.from({ length: limit }).forEach((_, key) => {
			cache.set(key, Math.random())
		})

		expect(cache.size).toBe(limit)

		await runGC()

		expect(cache.size).toBe(0)
	})

	it('should not break a loop when garbage collection runs inside the loop', async () => {
		const limit = 100
		const cache = new WeakCache<number, number>()

		Array.from({ length: limit }).forEach((_, key) => {
			cache.set(key, Math.random())
		})

		expect(cache.size).toBe(limit)

		let count = 0
		for(const _ of cache) {
			count++

			if(count === 10) {
				await runGC()
			}
		}

		expect(count).toBe(10)
	})
})
