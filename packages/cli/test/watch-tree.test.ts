import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { watchTree } from '../src/dev/watch-tree'

const ignored = new Set(['node_modules'])

const settle = () => new Promise(resolve => setTimeout(resolve, 300))

describe('watchTree', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-watch-'))
		await mkdir(join(root, 'src'))
		await mkdir(join(root, 'node_modules', 'dep'), { recursive: true })
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	for (const native of [true, false]) {
		it(`reports root relative paths & skips ignored directories (native: ${native})`, async () => {
			const seen: string[] = []
			const watcher = await watchTree(root, ignored, filename => seen.push(filename), { native })

			await settle()
			await writeFile(join(root, 'src', 'a.ts'), 'a')
			await writeFile(join(root, 'node_modules', 'dep', 'index.js'), 'dep')
			await settle()

			watcher.close()

			expect(seen).toContain(join('src', 'a.ts'))

			// The native watcher reports everything & the callers filter;
			// the walking watcher never even looks inside.
			if (!native) {
				expect(seen.some(path => path.startsWith('node_modules'))).toBe(false)
			}
		})
	}

	it('picks up directories created after the walk', async () => {
		const seen: string[] = []
		const watcher = await watchTree(root, ignored, filename => seen.push(filename), { native: false })

		await settle()
		await mkdir(join(root, 'src', 'nested'))
		await settle()
		await writeFile(join(root, 'src', 'nested', 'b.ts'), 'b')
		await settle()

		watcher.close()

		expect(seen).toContain(join('src', 'nested', 'b.ts'))
	})
})
