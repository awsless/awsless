import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMediaOrigin } from '../src/dev/media-origin'

describe('dev media origin', () => {
	let root: string
	let source: string
	let store: string

	const exists = (file: string) =>
		readFile(file).then(
			() => true,
			() => false
		)

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-media-'))
		source = join(root, 'source')
		store = join(root, 'store')

		await mkdir(join(source, 'team'), { recursive: true })
		await writeFile(join(source, 'logo.png'), 'logo v1')
		await writeFile(join(source, 'team/anna.png'), 'anna v1')
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	// What the image server cached for an original: a folder of its presets.
	const cacheVariant = async (original: string) => {
		await mkdir(join(store, 'cache', original), { recursive: true })
		await writeFile(join(store, 'cache', original, 'small.webp'), 'variant')
	}

	it('should seed the originals into the store', async () => {
		await createMediaOrigin(source, store).syncAll()

		expect(await readFile(join(store, 'origin/logo.png'), 'utf8')).toBe('logo v1')
		expect(await readFile(join(store, 'origin/team/anna.png'), 'utf8')).toBe('anna v1')
	})

	it('should drop the cached variants of an original that changed, and keep the others', async () => {
		const origin = createMediaOrigin(source, store)

		await origin.syncAll()
		await cacheVariant('logo.png')
		await cacheVariant('team/anna.png')

		// Replaced between two dev sessions.
		await writeFile(join(source, 'logo.png'), 'logo v2')
		await createMediaOrigin(source, store).syncAll()

		expect(await readFile(join(store, 'origin/logo.png'), 'utf8')).toBe('logo v2')
		expect(await exists(join(store, 'cache/logo.png/small.webp'))).toBe(false)
		expect(await exists(join(store, 'cache/team/anna.png/small.webp'))).toBe(true)

		// Replaced while the session runs: the watcher reports the one file.
		await writeFile(join(source, 'team/anna.png'), 'anna v2')
		await origin.sync('team/anna.png')

		expect(await readFile(join(store, 'origin/team/anna.png'), 'utf8')).toBe('anna v2')
		expect(await exists(join(store, 'cache/team/anna.png/small.webp'))).toBe(false)
	})

	it('should take an original that is gone out of the store, with what was cached for it', async () => {
		const origin = createMediaOrigin(source, store)

		await origin.syncAll()
		await cacheVariant('logo.png')

		await rm(join(source, 'logo.png'))
		await origin.syncAll()

		expect(await exists(join(store, 'origin/logo.png'))).toBe(false)
		expect(await exists(join(store, 'cache/logo.png/small.webp'))).toBe(false)
	})

	it("should leave a folder's own event alone", async () => {
		const origin = createMediaOrigin(source, store)

		await origin.syncAll()
		await cacheVariant('team/anna.png')
		await origin.sync('team')

		expect(await exists(join(store, 'cache/team/anna.png/small.webp'))).toBe(true)
	})
})
