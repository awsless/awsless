import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createReloadController } from '../src/dev/index'
import { createBundleWorker } from '../src/dev/worker'

const tick = () => new Promise(resolve => setTimeout(resolve, 10))

// A controller over a scripted build & a fake pool, so every ordering
// rule runs in milliseconds.
const setup = (props: { changed?: boolean; fail?: boolean; buildDelay?: number } = {}) => {
	const script = { changed: props.changed ?? true, fail: props.fail ?? false }
	let size = 2

	const build = vi.fn(async () => {
		if (props.buildDelay) {
			await new Promise(resolve => setTimeout(resolve, props.buildDelay))
		}

		if (script.fail) {
			throw new Error('build broke')
		}

		return script.changed
	})

	const worker = {
		restart: vi.fn(async () => {
			size = 2
		}),
		size: () => size,
	}

	const health: [string, string | undefined][] = []
	const logs: string[] = []

	const reload = createReloadController({
		build,
		worker,
		log: message => logs.push(message),
		reportHealth: (status, detail) => health.push([status, detail]),
	})

	return { reload, build, worker, health, logs, script, crash: (left: number) => (size = left) }
}

describe('dev reload controller', () => {
	it('should do nothing while clean', async () => {
		const { reload, build, worker } = setup()

		await reload.ensureFresh()

		expect(build).not.toHaveBeenCalled()
		expect(worker.restart).not.toHaveBeenCalled()
	})

	it('should rebuild once dirty & restart the workers when the output changed', async () => {
		const { reload, build, worker, health, logs } = setup()

		reload.markDirty()
		await reload.ensureFresh()
		await reload.ensureFresh()

		expect(build).toHaveBeenCalledTimes(1)
		expect(worker.restart).toHaveBeenCalledTimes(1)
		expect(health).toEqual([['up', '2']])
		expect(logs[0]).toMatch(/^Reloaded the bundle/)
	})

	it('should skip the restart when every build output is cached', async () => {
		const { reload, build, worker } = setup({ changed: false })

		reload.markDirty()
		await reload.ensureFresh()

		expect(build).toHaveBeenCalledTimes(1)
		expect(worker.restart).not.toHaveBeenCalled()
	})

	it('should restart on the next invoke once the whole pool crashed, even with cached builds', async () => {
		const { reload, worker, health, crash } = setup({ changed: false })

		crash(1)
		reload.onCrash({ code: 1, size: 1 })
		await reload.ensureFresh()

		// One worker left: nothing owed.
		expect(worker.restart).not.toHaveBeenCalled()
		expect(health).toEqual([['up', '1']])

		crash(0)
		reload.onCrash({ code: 1, size: 0 })

		expect(reload.isDirty()).toBe(true)
		expect(health.at(-1)).toEqual(['down', 'all workers crashed'])

		await reload.ensureFresh()

		expect(worker.restart).toHaveBeenCalledTimes(1)
		expect(health.at(-1)).toEqual(['up', '2'])
	})

	it('should keep a failed boot owed until a restart succeeds', async () => {
		const { reload, worker, health } = setup({ changed: false })

		reload.bootFailed(new Error('no bundle'))
		expect(health).toEqual([['down', 'no bundle']])

		worker.restart.mockRejectedValueOnce(new Error('still broken'))

		await expect(reload.ensureFresh()).rejects.toThrow('still broken')
		expect(reload.isDirty()).toBe(true)

		await reload.ensureFresh()

		expect(worker.restart).toHaveBeenCalledTimes(2)
		expect(health.at(-1)).toEqual(['up', '2'])
	})

	it('should surface a build error to the waiting dispatch & retry on the next one', async () => {
		const { reload, build, script, health } = setup()

		script.fail = true
		reload.markDirty()

		await expect(reload.ensureFresh()).rejects.toThrow('build broke')
		expect(health.at(-1)).toEqual(['down', 'build broke'])
		expect(reload.isDirty()).toBe(true)

		script.fail = false
		await reload.ensureFresh()

		expect(build).toHaveBeenCalledTimes(2)
	})

	it('should run one rebuild at a time & pick up a save made during it', async () => {
		const { reload, build, worker } = setup({ buildDelay: 30 })

		reload.markDirty()

		const first = reload.ensureFresh()
		const second = reload.ensureFresh()

		await tick()
		reload.markDirty()

		await Promise.all([first, second])

		expect(build).toHaveBeenCalledTimes(2)
		expect(worker.restart).toHaveBeenCalledTimes(2)
	})

	it('should serialize a config restart behind a rebuild in flight', async () => {
		const { reload, worker, logs } = setup({ buildDelay: 30 })

		reload.markDirty()
		const rebuilding = reload.ensureFresh()
		reload.restartWorker()

		await rebuilding
		await vi.waitFor(() => expect(worker.restart).toHaveBeenCalledTimes(2))

		expect(logs.at(-1)).toBe('Restarted the bundle worker.')
	})

	it('should never respawn workers once stopping', async () => {
		const { reload, build, worker } = setup({ buildDelay: 30 })

		reload.markDirty()
		const rebuilding = reload.ensureFresh()

		await tick()
		await reload.stop()
		await rebuilding

		expect(build).toHaveBeenCalledTimes(1)
		expect(worker.restart).not.toHaveBeenCalled()

		reload.restartWorker()
		reload.onCrash({ code: 1, size: 0 })
		await tick()

		expect(worker.restart).not.toHaveBeenCalled()
	})
})

describe('dev reload controller with a real worker pool', () => {
	let buildDir: string
	const previousWorkers = process.env.AWSLESS_DEV_WORKERS

	beforeAll(async () => {
		buildDir = await mkdtemp(join(tmpdir(), 'awsless-reload-'))
		await mkdir(join(buildDir, 'files'))
		await writeFile(
			join(buildDir, 'files', 'index.mjs'),
			`export default async event => {
	if (event.crash) process.exit(3)
	return { pid: process.pid }
}
`
		)

		process.env.AWSLESS_DEV_WORKERS = '1'
	})

	afterAll(async () => {
		await rm(buildDir, { recursive: true, force: true })

		if (previousWorkers === undefined) {
			delete process.env.AWSLESS_DEV_WORKERS
		} else {
			process.env.AWSLESS_DEV_WORKERS = previousWorkers
		}
	})

	it('should bring a crashed pool back on the next dispatch', async () => {
		const crashes: number[] = []
		const health: [string, string | undefined][] = []

		const worker = createBundleWorker({
			buildDir,
			env: { AWS_REGION: 'us-east-1', AWS_ACCOUNT_ID: '000000000000' },
			functionName: 'test-bundle',
			quiet: () => true,
			onCrash: info => {
				crashes.push(info.size)
				reload.onCrash(info)
			},
		})

		const reload = createReloadController({
			build: async () => false,
			worker,
			log: () => {},
			reportHealth: (status, detail) => health.push([status, detail]),
		})

		// The same path startDev's dispatch takes.
		const dispatch = async (event: unknown) => {
			await reload.ensureFresh()

			return worker.dispatch(event)
		}

		await worker.start()

		const first = (await dispatch({})) as { pid: number }

		await expect(dispatch({ crash: true })).rejects.toMatchObject({ name: 'WorkerCrashed' })
		await vi.waitFor(() => expect(crashes).toEqual([0]))

		expect(worker.size()).toBe(0)
		expect(health.at(-1)).toEqual(['down', 'all workers crashed'])

		const second = (await dispatch({})) as { pid: number }

		expect(second.pid).not.toBe(first.pid)
		expect(worker.size()).toBe(1)
		expect(health.at(-1)).toEqual(['up', '1'])

		await worker.stop()
	}, 30_000)
})
