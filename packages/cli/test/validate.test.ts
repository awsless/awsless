import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { sortKeysDeep, validateConfig } from '../src/config/load/validate'
import { ConfigError } from '../src/error'

describe('config validation', () => {
	it('should sort object keys at every depth', () => {
		const sorted = sortKeysDeep({ b: { z: 1, a: [{ y: 1, x: 2 }] }, a: 1 })

		expect(Object.keys(sorted)).toEqual(['a', 'b'])
		expect(Object.keys(sorted.b)).toEqual(['a', 'z'])
		expect(Object.keys(sorted.b.a[0]!)).toEqual(['x', 'y'])
	})

	it('should keep array order & leave class instances alone', () => {
		const date = new Date()
		const sorted = sortKeysDeep({ list: [3, 1, 2], date, nothing: null })

		expect(sorted.list).toEqual([3, 1, 2])
		expect(sorted.date).toBe(date)
		expect(sorted.nothing).toBeNull()
	})

	it('should return the parsed config with sorted keys', async () => {
		const schema = z.object({ name: z.string(), region: z.string().default('us-east-1') })
		const result = await validateConfig(schema, 'app.json', { name: 'app' })

		expect(Object.keys(result)).toEqual(['name', 'region'])
	})

	it('should wrap validation issues in a config error pointing at the file', async () => {
		const schema = z.object({ name: z.string() })

		await expect(validateConfig(schema, 'app.json', { name: 1 })).rejects.toBeInstanceOf(ConfigError)
	})
})
