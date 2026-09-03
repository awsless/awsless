import { execFile, spawn, SpawnOptions } from 'child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { promisify } from 'util'
import treeKill from 'tree-kill'
import { debug } from '../cli/debug.js'
import { directories } from '../util/path.js'

// Dev child processes must never outlive the dev command. The graceful
// stop already walks every server's stop chain, but a hard kill of the
// dev process reparents the children to pid 1 and leaves them running.
// Two layers close that gap:
//
// - stopping a child kills its whole process tree through tree-kill,
//   so grandchildren (like the bundler a vite dev server spawns) die
//   with it
// - every child lands in a pid file, and the next dev boot reaps any
//   tree that survived a hard kill of the previous run
//
// A pid can be recycled between runs, so the reaper verifies the
// command line before it kills anything.

type TrackedChild = {
	pid: number
	command: string
}

const tracked = new Map<number, TrackedChild>()

const childrenFile = () => {
	return join(directories.output, 'dev', 'children.json')
}

// Writes queue up one after another & land through a rename: parallel
// spawns would otherwise interleave their writes into a torn file.
let writing: Promise<void> = Promise.resolve()

const persist = () => {
	writing = writing
		.catch(() => {})
		.then(async () => {
			const file = childrenFile()
			const temp = `${file}.${process.pid}.tmp`

			await mkdir(dirname(file), { recursive: true })
			await writeFile(temp, JSON.stringify([...tracked.values()]))
			await rename(temp, file)
		})

	return writing
}

// Spawn a long lived dev child, tracked for the exit hook & pid file.
export const spawnDevChild = (command: string, args: string[], options: SpawnOptions = {}) => {
	const child = spawn(command, args, options)

	if (child.pid) {
		tracked.set(child.pid, { pid: child.pid, command: [command, ...args].join(' ') })
		void persist().catch(() => {})

		child.once('exit', () => {
			tracked.delete(child.pid!)
			void persist().catch(() => {})
		})
	}

	return child
}

// Kill a process and all its descendants.
export const killTree = (pid: number, signal: NodeJS.Signals) => {
	return new Promise<void>(resolve => {
		treeKill(pid, signal, () => resolve())
	})
}

const currentCommand = async (pid: number) => {
	try {
		const result = await promisify(execFile)('ps', ['-o', 'command=', '-p', String(pid)])

		return result.stdout.trim()
	} catch {
		return undefined
	}
}

const isTrackedChild = (value: unknown): value is TrackedChild => {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as TrackedChild).pid === 'number' &&
		typeof (value as TrackedChild).command === 'string'
	)
}

// Kill the process trees a previous dev run left behind after a hard
// kill. Runs before the local servers boot, so stale children can't
// hold on to their ports.
export const reapOrphanedDevChildren = async () => {
	const file = childrenFile()
	let content: string

	try {
		content = await readFile(file, 'utf8')
	} catch {
		return 0
	}

	let stale: TrackedChild[] = []

	try {
		const parsed: unknown = JSON.parse(content)

		stale = Array.isArray(parsed) ? parsed.filter(isTrackedChild) : []
	} catch (error) {
		// A torn file from a crashed run can't be reaped - it goes, so
		// the next run's writes start from a clean file again.
		debug('Ignoring the unreadable dev children file', error)
		await rm(file, { force: true })

		return 0
	}

	let reaped = 0

	for (const child of stale) {
		const command = await currentCommand(child.pid)

		if (command !== child.command) {
			continue
		}

		await killTree(child.pid, 'SIGKILL')
		reaped++
	}

	await rm(file, { force: true })

	return reaped
}

// The graceful stop chains empty the tracked set before the process
// exits - anything still here is a leftover from a crash. The exit
// hook can't walk process trees anymore, so the direct children die
// here and the next boot reaps whatever they leave behind.
process.once('exit', () => {
	for (const child of tracked.values()) {
		try {
			process.kill(child.pid, 'SIGKILL')
		} catch {}
	}
})
