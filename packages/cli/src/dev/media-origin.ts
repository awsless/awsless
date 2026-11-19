import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { glob } from 'glob'
import { DevContext } from '../feature.js'
import { watchTree, TreeWatcher } from './watch-tree.js'

// The static originals of an image or icon server go into the local store,
// like the deploy puts them in s3. A cached variant is only good for the
// original it was made from, so an original that changed takes its cached
// variants with it.
export const createMediaOrigin = (source: string, store: string) => {
	const origin = join(store, 'origin')
	const cache = join(store, 'cache')

	const read = (file: string) => readFile(file).catch(() => undefined)

	// Brings one original in line with its source file, by its path in the folder.
	const sync = async (file: string) => {
		const from = join(source, file)
		const to = join(origin, file)

		// A folder's own event; its files report themselves.
		if ((await stat(from).catch(() => undefined))?.isDirectory()) {
			return
		}

		const [next, current] = await Promise.all([read(from), read(to)])

		if (next && current?.equals(next)) {
			return
		}

		// Cached under the original's path: a folder of presets for an image, a file for an icon.
		await rm(join(cache, file), { recursive: true, force: true })

		if (next) {
			await mkdir(dirname(to), { recursive: true })
			await writeFile(to, next)
		} else {
			await rm(to, { recursive: true, force: true })
		}
	}

	// Every original the source has, and every one it no longer has.
	const syncAll = async () => {
		const files = await Promise.all([source, origin].map(cwd => glob('**/*', { cwd, nodir: true })))

		for (const file of new Set(files.flat())) {
			await sync(file)
		}
	}

	return { sync, syncAll }
}

// Seeds the originals now, and follows the folder for as long as the dev session runs.
export const seedMediaOrigin = async (ctx: DevContext, name: string, source: string, store: string) => {
	const mediaOrigin = createMediaOrigin(source, store)
	let watcher: TreeWatcher | undefined

	await mediaOrigin.syncAll()

	ctx.registerServer({
		name,
		async start() {
			watcher = await watchTree(source, new Set(), file => void mediaOrigin.sync(file).catch(() => {}))
		},
		stop() {
			watcher?.close()
		},
	})
}
