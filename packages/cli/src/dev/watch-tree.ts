import { FSWatcher, watch } from 'fs'
import { readdir, stat } from 'fs/promises'
import { join, relative, sep } from 'path'
import { debug } from '../cli/debug.js'

export type TreeWatcher = {
	close: () => void
}

type Options = {
	// Forced off in tests, to exercise the per-directory mode anywhere.
	native?: boolean
}

// One watcher for a whole project tree, reporting root relative paths.
// macOS & windows get the native recursive watcher, which is cheap.
// On linux a recursive watch walks EVERY directory, node_modules
// included, and runs into the inotify & descriptor limits of small
// containers - so there the tree is walked here, skipping the ignored
// directories, with one plain watch per directory.
export const watchTree = async (
	root: string,
	ignored: Set<string>,
	listener: (filename: string) => void,
	options: Options = {}
): Promise<TreeWatcher> => {
	const native = options.native ?? (process.platform === 'darwin' || process.platform === 'win32')

	if (native) {
		const watcher = watch(root, { recursive: true }, (_event, filename) => {
			if (filename) {
				listener(filename)
			}
		})

		return { close: () => watcher.close() }
	}

	const watchers = new Map<string, FSWatcher>()
	let closed = false

	const add = async (dir: string) => {
		if (closed || watchers.has(dir)) {
			return
		}

		let watcher: FSWatcher

		try {
			watcher = watch(dir, (event, filename) => {
				if (!filename) {
					return
				}

				const path = join(dir, filename)
				const name = relative(root, path)

				// Some platforms report nested paths from a plain watch too.
				if (name.split(sep).some(segment => ignored.has(segment))) {
					return
				}

				listener(name)

				// A directory that just appeared needs its own watch.
				if (event === 'rename' && !ignored.has(filename)) {
					void stat(path)
						.then(info => (info.isDirectory() ? walk(path) : undefined))
						.catch(() => {})
				}
			})
		} catch (error) {
			debug(`Can't watch ${dir}`, error)
			return
		}

		watcher.on('error', error => debug(`Watcher error in ${dir}`, error))
		watchers.set(dir, watcher)
	}

	const walk = async (dir: string) => {
		await add(dir)

		let entries

		try {
			entries = await readdir(dir, { withFileTypes: true })
		} catch {
			return
		}

		for (const entry of entries) {
			// Symlinked directories can loop or point into dependencies.
			if (entry.isDirectory() && !entry.isSymbolicLink() && !ignored.has(entry.name)) {
				await walk(join(dir, entry.name))
			}
		}
	}

	await walk(root)

	return {
		close: () => {
			closed = true

			for (const watcher of watchers.values()) {
				watcher.close()
			}

			watchers.clear()
		},
	}
}
