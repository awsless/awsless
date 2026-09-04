import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { runTests } from '../src/cli/ui/complex/run-tests'
import { TestResponse } from '../src/test/start'
import { setRoot } from '../src/util/path'

const mocks = vi.hoisted(() => ({
	start: vi.fn(),
}))

vi.mock('../src/test/start', () => ({ startProjectsTest: mocks.start }))

vi.mock('@awsless/clui', async importOriginal => {
	const mod = await importOriginal<typeof import('@awsless/clui')>()

	return {
		...mod,
		log: {
			...mod.log,
			step: () => {},
			error: () => {},
			message: () => {},
			task: async (props: { task: (ctx: unknown) => Promise<void> }) => {
				await props.task({ updateMessage() {}, updateSuccessMessage() {} })
			},
		},
	}
})

const response = (failed = 0): TestResponse => ({
	passed: 1,
	failed,
	skipped: 0,
	duration: 5_000_000n,
	errors: [],
	tests: [{ file: 'a.test.ts', name: 'works', errors: [], logs: [] }],
})

describe('test runner cache', () => {
	let root: string
	let dir: string

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-tests-'))
		dir = join(root, 'stacks/a/test')

		await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'project', type: 'module' }))
		// The folder hashes resolve dependencies through the lock file.
		await writeFile(
			join(root, 'bun.lock'),
			JSON.stringify({
				lockfileVersion: 1,
				workspaces: { '': { name: 'project', dependencies: {} } },
				packages: {},
			})
		)
		await mkdir(dir, { recursive: true })
		await writeFile(join(dir, 'a.test.ts'), `it('works', () => {})\n`)

		setRoot(root)
	})

	afterAll(async () => {
		setRoot()
		await rm(root, { recursive: true, force: true })
	})

	afterEach(() => {
		mocks.start.mockReset()
		delete process.env.NO_CACHE
	})

	const tests = () => [{ stackName: 'a', name: 'a', paths: [dir] }]

	it('should run the stack once & remember the result', async () => {
		mocks.start.mockResolvedValue(new Map([['a', response()]]))

		await expect(runTests(tests(), [], [], { showLogs: false })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)

		const cached = JSON.parse(await readFile(join(root, '.awsless/test/a.json'), 'utf8'))
		expect(cached.fingerprint).toEqual(expect.any(String))

		await expect(runTests(tests(), [], [], { showLogs: false })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)
	})

	it('should run again when the test files change', async () => {
		mocks.start.mockResolvedValue(new Map([['a', response()]]))
		await writeFile(join(dir, 'a.test.ts'), `it('works', () => { expect(1).toBe(1) })\n`)

		await expect(runTests(tests(), [], [], { showLogs: false })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)
	})

	it('should run again when the manifest changes the fingerprint', async () => {
		mocks.start.mockResolvedValue(new Map([['a', response()]]))
		const manifest = { app: 'app', streams: [], functions: [], tasks: [], queues: [], servers: {} }

		await expect(runTests(tests(), [], [], { showLogs: false, manifest: manifest as never })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)
	})

	it('should run again when a cron consumer changes', async () => {
		mocks.start.mockResolvedValue(new Map([['a', response()]]))
		const cron = join(root, 'stacks/a/src/tick.ts')
		await mkdir(dirname(cron), { recursive: true })
		await writeFile(cron, 'export default () => 1\n')

		const manifest = {
			app: 'app',
			streams: [],
			functions: [],
			tasks: [],
			queues: [],
			crons: [{ stack: 'a', id: 'tick', file: cron }],
			servers: {},
		} as never

		await expect(runTests(tests(), [], [], { showLogs: false, manifest })).resolves.toBe(true)
		await expect(runTests(tests(), [], [], { showLogs: false, manifest })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)

		// The cron mock runs the consumer, so its code is part of the fingerprint.
		await writeFile(cron, 'export default () => 2\n')

		await expect(runTests(tests(), [], [], { showLogs: false, manifest })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(2)
	})

	it('should run again when a test config value changes', async () => {
		mocks.start.mockResolvedValue(new Map([['a', response()]]))

		const manifest = (configs: Record<string, string>) =>
			({ app: 'app', configs, streams: [], functions: [], tasks: [], queues: [], servers: {} }) as never

		await expect(
			runTests(tests(), [], [], { showLogs: false, manifest: manifest({ greeting: 'a' }) })
		).resolves.toBe(true)
		await expect(
			runTests(tests(), [], [], { showLogs: false, manifest: manifest({ greeting: 'a' }) })
		).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)

		// The config values reach the handlers through the manifest, so
		// a cached result from other values is stale.
		await expect(
			runTests(tests(), [], [], { showLogs: false, manifest: manifest({ greeting: 'b' }) })
		).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(2)
	})

	it('should ignore the cache with --no-cache', async () => {
		process.env.NO_CACHE = '1'
		mocks.start.mockResolvedValue(new Map([['a', response()]]))

		await expect(runTests(tests(), [], [], { showLogs: false })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)
	})

	it('should fail from the cache without rerunning a failed stack', async () => {
		mocks.start.mockResolvedValue(new Map([['a', response(1)]]))
		await writeFile(join(dir, 'a.test.ts'), `it('fails', () => { expect(1).toBe(2) })\n`)

		await expect(runTests(tests(), [], [], { showLogs: false })).resolves.toBe(false)
		expect(mocks.start).toHaveBeenCalledTimes(1)

		await expect(runTests(tests(), [], [], { showLogs: false })).resolves.toBe(false)
		expect(mocks.start).toHaveBeenCalledTimes(1)
	})

	it('should cache every test folder of a stack on its own', async () => {
		const first = join(root, 'stacks/c/one')
		const second = join(root, 'stacks/c/two')
		await mkdir(first, { recursive: true })
		await mkdir(second, { recursive: true })
		await writeFile(join(first, 'a.test.ts'), `it('works', () => {})\n`)
		await writeFile(join(second, 'b.test.ts'), `it('works', () => {})\n`)

		mocks.start.mockResolvedValue(
			new Map([
				['c:0', response()],
				['c:1', response()],
			])
		)
		const stack = () => [{ stackName: 'c', name: 'c', paths: [first, second] }]

		await expect(runTests(stack(), [], [], { showLogs: false })).resolves.toBe(true)
		await expect(runTests(stack(), [], [], { showLogs: false })).resolves.toBe(true)
		expect(mocks.start).toHaveBeenCalledTimes(1)
	})

	it('should skip stacks whose test folder holds no test files', async () => {
		const empty = join(root, 'stacks/b/test')
		await mkdir(empty, { recursive: true })
		await writeFile(join(empty, '_helper.ts'), 'export const x = 1\n')

		await expect(
			runTests([{ stackName: 'b', name: 'b', paths: [empty] }], [], [], { showLogs: false })
		).resolves.toBe(true)
		expect(mocks.start).not.toHaveBeenCalled()
	})
})
