import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createBundleWorker, WorkerError } from '../src/dev/worker'

// A stand-in for the built bundle: the handler misbehaves on request,
// so the pool's crash & error handling can be driven from the test.
const BUNDLE = `export default async (event, context) => {
	if (event.crash) process.exit(3)
	if (event.throw) throw new TypeError('boom')
	if (event.bigint) return { value: 1n }
	if (event.sleep) await new Promise(resolve => setTimeout(resolve, event.sleep))
	if (event.log) console.log(event.log)
	return { echo: event, pid: process.pid, arn: context.invokedFunctionArn }
}
export const getCurrentRoute = () => 'stack:route'
`

const waitFor = (condition: () => boolean, timeout = 10_000) => {
	return vi.waitFor(() => expect(condition()).toBe(true), { timeout, interval: 50 })
}

// Concurrent dispatches spread over the pool, so the set holds the
// pid of every live worker.
const livePids = async (worker: ReturnType<typeof createBundleWorker>) => {
	const results = await Promise.all(Array.from({ length: 4 }, () => worker.dispatch({ sleep: 50 })))

	return new Set(results.map(result => (result as { pid: number }).pid))
}

describe('dev bundle worker pool', () => {
	let buildDir: string
	const output: { line: string; stream: string; route?: string }[] = []
	const crashes: { code: number | null; size: number }[] = []
	const previousWorkers = process.env.AWSLESS_DEV_WORKERS

	let worker: ReturnType<typeof createBundleWorker>

	beforeAll(async () => {
		buildDir = await mkdtemp(join(tmpdir(), 'awsless-worker-'))
		await mkdir(join(buildDir, 'files'))
		await writeFile(join(buildDir, 'files', 'index.mjs'), BUNDLE)

		process.env.AWSLESS_DEV_WORKERS = '2'

		worker = createBundleWorker({
			buildDir,
			env: { AWS_REGION: 'us-east-1', AWS_ACCOUNT_ID: '000000000000' },
			functionName: 'test-bundle',
			quiet: () => true,
			onOutput: (line, stream, route) => output.push({ line, stream, route }),
			onCrash: info => crashes.push(info),
		})

		await worker.start()
	}, 30_000)

	afterAll(async () => {
		await worker.stop()
		await rm(buildDir, { recursive: true, force: true })

		if (previousWorkers === undefined) {
			delete process.env.AWSLESS_DEV_WORKERS
		} else {
			process.env.AWSLESS_DEV_WORKERS = previousWorkers
		}
	})

	it('should dispatch into the pool & tag the console output with the route', async () => {
		expect(worker.size()).toBe(2)

		await expect(worker.dispatch({ log: 'hello\nworld' })).resolves.toMatchObject({
			echo: { log: 'hello\nworld' },
			arn: 'arn:aws:lambda:us-east-1:000000000000:function:test-bundle:local',
		})

		await waitFor(() => output.some(record => record.line === 'hello\nworld'))

		expect(output.find(record => record.line === 'hello\nworld')).toEqual({
			line: 'hello\nworld',
			stream: 'stdout',
			route: 'stack:route',
		})
	})

	it('should surface handler errors without losing the worker', async () => {
		const error = await worker.dispatch({ throw: true }).catch(e => e)

		expect(error).toBeInstanceOf(WorkerError)
		expect(error).toMatchObject({ name: 'TypeError', message: 'boom' })
		expect(worker.size()).toBe(2)
	})

	it('should turn an unserializable result into a handler error', async () => {
		const error = (await worker.dispatch({ bigint: true }).catch(e => e)) as Error

		expect(error).toBeInstanceOf(WorkerError)
		expect(error.message).toMatch(/BigInt/i)

		// The worker survived the encoding failure.
		expect(worker.size()).toBe(2)
		await expect(worker.dispatch({})).resolves.toMatchObject({ echo: {} })
	})

	it('should evict a crashed worker & keep serving on the rest', async () => {
		const before = await livePids(worker)

		expect(before.size).toBe(2)

		await expect(worker.dispatch({ crash: true })).rejects.toThrow()

		// The dead worker leaves right away, nothing replaces it.
		await waitFor(() => crashes.length === 1)

		expect(crashes[0]).toEqual({ code: 3, size: 1 })
		expect(worker.size()).toBe(1)

		const after = await livePids(worker)

		expect(after.size).toBe(1)
		expect(before.has([...after][0]!)).toBe(true)
	}, 20_000)

	it('should report an empty pool & come back on the next restart', async () => {
		await expect(worker.dispatch({ crash: true })).rejects.toThrow()
		await waitFor(() => crashes.length === 2)

		expect(crashes[1]).toEqual({ code: 3, size: 0 })
		expect(worker.size()).toBe(0)

		// Nothing left to dispatch to - the dev server's ensureFresh
		// turns this into a restart on the next invoke.
		await expect(worker.dispatch({})).rejects.toThrow('The bundle worker is not running.')

		await worker.restart()

		expect(worker.size()).toBe(2)
		await expect(worker.dispatch({})).resolves.toMatchObject({ echo: {} })
	}, 20_000)

	it('should hold dispatches during a restart instead of failing them', async () => {
		const before = await livePids(worker)
		const restarting = worker.restart()
		const dispatched = worker.dispatch({ sleep: 10 })

		await expect(dispatched).resolves.toMatchObject({ echo: { sleep: 10 } })
		await restarting

		const after = await livePids(worker)

		expect([...after].some(pid => before.has(pid))).toBe(false)
		expect(after.size).toBe(2)
	}, 20_000)

	it('should refuse dispatches once stopped', async () => {
		const reported = crashes.length

		await worker.stop()

		expect(worker.size()).toBe(0)
		await expect(worker.dispatch({})).rejects.toThrow('The bundle worker is not running.')

		// A stop never reads as a crash.
		expect(crashes).toHaveLength(reported)

		await worker.start()
		expect(worker.size()).toBe(2)
	}, 20_000)
})
