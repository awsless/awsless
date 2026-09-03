import { seconds } from '@awsless/duration'
import { Config } from '../src/lib/server/config'
import { Cron } from '../src/lib/server/cron'
import { Fn } from '../src/lib/server/function'
import { Instance } from '../src/lib/server/instance'
import { Queue } from '../src/lib/server/queue'
import { Store } from '../src/lib/server/store'
import { Task } from '../src/lib/server/task'
import { mock } from '../src/lib/test/mock'
import { setupTestEnv, TestManifest } from '../src/lib/test/setup'

process.env.APP = 'app'
process.env.APP_ID = 'abc'
process.env.AWS_REGION = 'eu-west-1'
process.env.AWS_ACCESS_KEY_ID ??= 'local'
process.env.AWS_SECRET_ACCESS_KEY ??= 'local'

const fixture = (name: string) => new URL(`./_fixture/${name}.ts`, import.meta.url).href

const manifest: TestManifest = {
	app: 'app',
	region: 'eu-west-1',
	configs: { SECRET: 'from-manifest' },
	tables: [],
	tableKeys: [],
	streams: [],
	searches: [],
	functions: [
		{ stack: 'stack', id: 'echo', file: fixture('echo') },
		{ stack: 'stack', id: 'flaky', file: 'flaky' },
	],
	crons: [{ stack: 'stack', id: 'tick', file: fixture('cron') }],
	tasks: [{ stack: 'stack', id: 'work', file: fixture('task') }],
	queues: [{ stack: 'stack', id: 'jobs' }],
	topics: [],
	pubsub: [],
	caches: [],
	alerts: [],
	jobs: [],
	instances: [{ stack: 'stack', id: 'worker' }],
}

// The first import of the flaky handler fails, the next one works.
let flakyImports = 0

await setupTestEnv(manifest, {
	importFile: async file => {
		if (file === 'flaky') {
			if (flakyImports++ === 0) {
				throw new Error('transient import failure')
			}

			return { default: async () => 'recovered' }
		}

		return import(/* @vite-ignore */ file)
	},
})

const fn = Fn as any
const cron = Cron as any
const task = Task as any
const queue = Queue as any
const instance = Instance as any
const store = Store as any
const m = mock as any

// A module scope override is the baseline every test starts from.
m.function.stack.echo(() => 'baseline')

describe('mock overrides', () => {
	it('starts from the baseline & allows a temporary override', async () => {
		await expect(fn.stack.echo({})).resolves.toBe('baseline')

		m.function.stack.echo(() => 'temporary')

		await expect(fn.stack.echo({})).resolves.toBe('temporary')
	})

	it('resets a temporary override after the test', async () => {
		await expect(fn.stack.echo({})).resolves.toBe('baseline')
		expect(m.function.stack.echo).toHaveBeenCalledTimes(1)
	})

	it('records canned responses', async () => {
		m.function.stack.echo({ canned: true })

		await expect(fn.stack.echo({ n: 1 })).resolves.toStrictEqual({ canned: true })
		expect(m.function.stack.echo).toHaveBeenCalledWith({ n: 1 })
	})

	it('fails for undeclared resources', () => {
		expect(() => m.function.stack.unknown).toThrow('No test mock exists')
	})
})

describe('handler imports', () => {
	it('retries a failed handler import', async () => {
		await expect(fn.stack.flaky({})).rejects.toThrow('transient import failure')
		await expect(fn.stack.flaky({})).resolves.toBe('recovered')
	})
})

describe('config', () => {
	it('applies the manifest values & mock overrides', () => {
		expect((Config as any).SECRET).toBe('from-manifest')

		m.config.SECRET = 'overridden'

		expect((Config as any).SECRET).toBe('overridden')
		expect(m.config.SECRET).toBe('overridden')
	})
})

describe('cron', () => {
	it('runs the real cron handler', async () => {
		await cron.stack.tick()

		expect(m.cron.stack.tick).toHaveBeenCalledTimes(1)
	})

	it('overrides the cron handler', async () => {
		const run = vi.fn()
		m.cron.stack.tick(run)

		await cron.stack.tick({ manual: true })

		expect(run).toHaveBeenCalledWith({ manual: true })
	})
})

describe('task', () => {
	it('runs a direct invoke without touching the schedule spy', async () => {
		const { runs } = await import('./_fixture/task')

		await task.stack.work({ n: 1 })

		expect(runs).toContainEqual({ n: 1 })
		expect(m.task.stack.work).toHaveBeenCalledWith({ n: 1 })
		expect(m.task.stack.work.scheduled).not.toHaveBeenCalled()
	})

	it('records a scheduled invoke apart & still runs the task', async () => {
		await task.stack.work({ n: 2 }, { schedule: seconds(30) })

		expect(m.task.stack.work.scheduled).toHaveBeenCalledWith({ n: 2 })
		expect(m.task.stack.work).toHaveBeenCalledWith({ n: 2 })
	})

	it('overrides scheduled runs on their own', async () => {
		m.task.stack.work.scheduled(() => {})

		await task.stack.work({ n: 3 }, { schedule: seconds(30) })

		expect(m.task.stack.work.scheduled).toHaveBeenCalledWith({ n: 3 })
		expect(m.task.stack.work).not.toHaveBeenCalled()
	})
})

describe('queue & instance', () => {
	it('records queue sends', async () => {
		await queue.stack.jobs({ n: 1 }, { groupId: 'g', deduplicationId: 'd' })

		expect(m.queue.stack.jobs).toHaveBeenCalledTimes(1)
	})

	it('records instance sends', async () => {
		await instance.stack.worker({ n: 1 })

		expect(m.instance.stack.worker).toHaveBeenCalledTimes(1)
	})
})

describe('store', () => {
	it('rides the in-memory s3', async () => {
		const files = store.stack.files

		expect(files.name).toBe('app--store--assets--abc')
		expect(files.folder).toBe('store/stack/files/')

		await files.put('a.txt', 'hello')

		await expect(files.has('a.txt')).resolves.toBe(true)
		await expect(files.get('a.txt')).resolves.toBeDefined()

		await files.delete('a.txt')

		await expect(files.has('a.txt')).resolves.toBe(false)
		await expect(files.get('a.txt')).resolves.toBeUndefined()
	})
})
