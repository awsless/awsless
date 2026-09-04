import { access, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { directories, setRoot } from '../src/util/path'
import { createTempFolder } from '../src/util/temp'

describe('temporary build folders', () => {
	const previousRoot = directories.root
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-temp-test-'))
		setRoot(root)
	})

	afterEach(async () => {
		setRoot(previousRoot)
		await rm(root, { recursive: true, force: true })
	})

	it('isolates concurrent builds with the same name', async () => {
		const [first, second] = await Promise.all([createTempFolder('bundle'), createTempFolder('bundle')])
		await using firstFolder = first
		await using secondFolder = second

		expect(firstFolder.path).not.toBe(secondFolder.path)
		await writeFile(join(secondFolder.path, 'entry.ts'), 'second build')
		await firstFolder.delete()
		expect(await readFile(join(secondFolder.path, 'entry.ts'), 'utf8')).toBe('second build')
	})

	it.each([false, true])('cleans up when a build leaves its scope (failure: %s)', async fail => {
		let path!: string
		const error = new Error('build failed')
		const build = async () => {
			await using temp = await createTempFolder('function')
			path = temp.path
			await writeFile(join(path, 'entry.ts'), 'build input')
			if (fail) throw error
		}

		if (fail) {
			await expect(build()).rejects.toBe(error)
		} else {
			await build()
		}
		await expect(access(path)).rejects.toMatchObject({ code: 'ENOENT' })
	})
})
