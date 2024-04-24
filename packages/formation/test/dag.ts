import { run } from 'promise-dag'

describe('Dag', () => {
	it('should stop dependencies when the dependent fails', async () => {
		const mock = vi.fn()
		const graph = run({
			one: [
				async () => {
					throw new Error('stack error')
				},
			],
			two: [
				'one',
				async () => {
					mock()
				},
			],
		})

		await Promise.allSettled(Object.values(graph))

		expect(mock).not.toBeCalled()
	})
})
