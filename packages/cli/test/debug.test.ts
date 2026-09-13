import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { debug, debugLogFile, openDebugLog } from '../src/cli/debug'
import { setRoot } from '../src/util/path'

describe('debug log', () => {
	let root: string

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-debug-'))
	})

	afterAll(async () => {
		setRoot()
		await rm(root, { recursive: true, force: true })
	})

	it('should hold lines in memory until the project root is known', async () => {
		debug('before')

		expect(debugLogFile()).toBeUndefined()

		setRoot(root)
		openDebugLog()

		const file = debugLogFile()!

		expect(file).toBe(join(root, '.awsless', 'debug.log'))

		debug('after', { count: 2 })

		const lines = (await readFile(file, 'utf8')).trim().split('\n')

		expect(lines).toHaveLength(2)
		expect(lines[0]).toMatch(/\[debug\] before$/)
		expect(lines[1]).toMatch(/\[debug\] after {"count":2}$/)
	})
})
