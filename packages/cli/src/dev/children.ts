import { execFile, spawn, SpawnOptions } from 'child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { promisify } from 'util'
import treeKill from 'tree-kill'
import { debug } from '../cli/debug.js'
import { directories } from '../util/path.js'

// A hard kill of the dev process reparents its children to pid 1, so
// every child lands in a pid file & the next boot reaps the leftovers.

type TrackedChild = {
	pid: number
	command: string
	// The dev process that spawned the child, so a restart inside the
	// same process never reaps its own live children.
	owner: number
}

const tracked = new Map<number, TrackedChild>()

const childrenFile = () => {
	return join(directories.output, 'dev', 'children.json')
}

// Serialized & renamed into place, or parallel spawns tear the file.
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

	// Without a listener a spawn failure (like a missing binary) throws
	// out of the emitter & takes down the whole dev process.
	child.on('error', error => {
		debug(`Dev child "${command}" failed`, error)
	})

	if (child.pid) {
		tracked.set(child.pid, { pid: child.pid, command: [command, ...args].join(' '), owner: process.pid })
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

const isAlive = (pid: number) => {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
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
// kill, before the local servers need their ports again.
export const reapOrphanedDevChildren = async (options: { file?: string; self?: number } = {}) => {
	const file = options.file ?? childrenFile()
	const self = options.self ?? process.pid
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
	const kept: TrackedChild[] = []

	for (const child of stale) {
		// A living owner (this process on a config restart, or another
		// dev run) still manages its children - only orphans die.
		if (typeof child.owner === 'number' && (child.owner === self || isAlive(child.owner))) {
			kept.push(child)
			continue
		}

		// A pid can be recycled between runs, so the command line must
		// still match before anything dies.
		const command = await currentCommand(child.pid)

		if (command !== child.command) {
			continue
		}

		await killTree(child.pid, 'SIGKILL')
		reaped++
	}

	if (kept.length > 0) {
		await writeFile(file, JSON.stringify(kept))
	} else {
		await rm(file, { force: true })
	}

	return reaped
}

// The exit hook can't walk process trees anymore, so the direct
// children die here and the next boot reaps whatever they leave.
process.once('exit', () => {
	for (const child of tracked.values()) {
		try {
			process.kill(child.pid, 'SIGKILL')
		} catch {}
	}
})
