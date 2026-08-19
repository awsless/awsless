import { execFile, spawn, SpawnOptions } from 'child_process'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { promisify } from 'util'
import treeKill from 'tree-kill'
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

const persist = async () => {
	const file = childrenFile()

	await mkdir(dirname(file), { recursive: true })
	await writeFile(file, JSON.stringify([...tracked.values()]))
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
	} catch (_) {
		return undefined
	}
}

// Kill the process trees a previous dev run left behind after a hard
// kill. Runs before the local servers boot, so stale children can't
// hold on to their ports.
export const reapOrphanedDevChildren = async () => {
	let stale: TrackedChild[] = []

	try {
		stale = JSON.parse(await readFile(childrenFile(), 'utf8')) as TrackedChild[]
	} catch (_) {
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

	await rm(childrenFile(), { force: true })

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
		} catch (_) {}
	}
})
