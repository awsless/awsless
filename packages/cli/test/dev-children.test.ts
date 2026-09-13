import { spawn } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { reapOrphanedDevChildren } from '../src/dev/children'

const alive = (pid: number) => {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

// A process whose owner is gone, exactly like a child left behind by a
// hard-killed dev run.
const orphan = () => {
	const child = spawn('sleep', ['30'], { stdio: 'ignore', detached: true })
	child.unref()

	return child
}

// A pid that is certainly dead, for the owner of an orphan.
const deadPid = async () => {
	const child = spawn('sleep', ['0'], { stdio: 'ignore' })

	await new Promise(resolve => child.once('exit', resolve))

	return child.pid!
}

describe('dev children reaper', () => {
	const cleanup: (() => void)[] = []

	afterAll(() => {
		for (const fn of cleanup) fn()
	})

	it('should reap orphans but never the children of a living owner', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'awsless-children-'))
		const file = join(dir, 'children.json')
		const orphaned = orphan()
		const owned = orphan()
		const recycled = orphan()

		cleanup.push(() => {
			for (const child of [orphaned, owned, recycled]) {
				try {
					process.kill(child.pid!, 'SIGKILL')
				} catch {}
			}
		})

		await vi.waitFor(() => expect(alive(orphaned.pid!) && alive(owned.pid!) && alive(recycled.pid!)).toBe(true))

		const owner = await deadPid()

		await writeFile(
			file,
			JSON.stringify([
				{ pid: orphaned.pid, command: 'sleep 30', owner },
				// This process is the owner, like a config restart.
				{ pid: owned.pid, command: 'sleep 30', owner: process.pid },
				// The pid lives on but runs something else now.
				{ pid: recycled.pid, command: 'node old-worker.mjs', owner },
			])
		)

		await expect(reapOrphanedDevChildren({ file, self: process.pid })).resolves.toBe(1)

		await vi.waitFor(() => expect(alive(orphaned.pid!)).toBe(false))
		expect(alive(owned.pid!)).toBe(true)
		expect(alive(recycled.pid!)).toBe(true)

		// The living owner's entries survive for the next boot.
		expect(JSON.parse(await readFile(file, 'utf8'))).toEqual([
			{ pid: owned.pid, command: 'sleep 30', owner: process.pid },
		])

		await rm(dir, { recursive: true, force: true })
	})

	it('should drop a torn file & reap nothing', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'awsless-children-'))
		const file = join(dir, 'children.json')

		await writeFile(file, '[{"pid": 1')

		await expect(reapOrphanedDevChildren({ file })).resolves.toBe(0)
		await expect(readFile(file)).rejects.toThrow()

		await rm(dir, { recursive: true, force: true })
	})
})
