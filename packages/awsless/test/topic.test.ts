import { publish } from '@awsless/sns'
import { object, pipe, string, transform } from '@awsless/validate'
import { Topic } from '../src/lib/server/topic'

vi.mock('@awsless/sns', () => ({
	publish: vi.fn(async () => undefined),
}))

vi.stubEnv('APP', 'app')

describe('topic', () => {
	const events = (Topic as any).events.define(object({ n: pipe(string(), transform(Number)) }))

	beforeEach(() => {
		vi.mocked(publish).mockClear()
	})

	afterAll(() => {
		vi.unstubAllEnvs()
	})

	it('carries its name & schema for the subscriber', () => {
		expect(events.name).toBe('app--topic--events')
		expect(events.schema).toBeDefined()
	})

	it('validates the input but publishes it untransformed', async () => {
		await events({ n: '1' })

		expect(publish).toHaveBeenCalledWith(
			expect.objectContaining({ topic: 'app--topic--events', payload: '{"n":"1"}' })
		)
	})

	it('rejects invalid input before publishing', async () => {
		await expect(events({ n: 1 })).rejects.toThrow()
		expect(publish).not.toHaveBeenCalled()
	})
})
