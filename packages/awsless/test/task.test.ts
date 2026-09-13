import { seconds } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import { schedule } from '@awsless/scheduler'
import { Task } from '../src/lib/server/task'

vi.mock('@awsless/lambda', async importOriginal => ({
	...(await importOriginal<typeof import('@awsless/lambda')>()),
	invoke: vi.fn(async () => undefined),
}))

vi.mock('@awsless/scheduler', () => ({
	schedule: vi.fn(async () => undefined),
}))

// The proxy binds the physical name on first access, so the app env
// exists before the describe body touches it.
vi.stubEnv('APP', 'app')

describe('task', () => {
	const work = (Task as any).stack.work

	beforeEach(() => {
		vi.mocked(invoke).mockClear()
		vi.mocked(schedule).mockClear()
	})

	afterAll(() => {
		vi.unstubAllEnvs()
	})

	it('invokes the task directly in tests', async () => {
		await work({ n: 1 })

		expect(invoke).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'app--stack--task--work', payload: { n: 1 } })
		)
		expect(schedule).not.toHaveBeenCalled()
	})

	it('records scheduled tasks on the scheduler in tests', async () => {
		await work({ n: 2 }, { schedule: seconds(10) })

		expect(schedule).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'app--stack--task--work', payload: { n: 2 }, schedule: seconds(10) })
		)
		expect(invoke).not.toHaveBeenCalled()
	})
})
