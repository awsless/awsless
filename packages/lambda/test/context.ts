import { getContext, lambda } from '../src'

describe('Context API', () => {
	it('payload', async () => {
		const handle = lambda({
			handle() {
				const ctx = getContext()

				expect(ctx?.event).toBe('hello')
				expect(ctx?.raw).toBe('hello')
			},
		})

		await handle('hello')
	})

	describe('hooks', () => {
		it('onSuccess', async () => {
			const onsuccess = vi.fn()
			const onfailure = vi.fn()
			const onfinally = vi.fn()

			const handle = lambda({
				handle() {
					const ctx = getContext()

					ctx?.onSuccess(onsuccess)
					ctx?.onFailure(onfailure)
					ctx?.onFinally(onfinally)
				},
			})

			await handle()

			expect(onsuccess).toHaveBeenCalled()
			expect(onfailure).not.toHaveBeenCalled()
			expect(onfinally).toHaveBeenCalled()
		})

		it('onFailure', async () => {
			const onsuccess = vi.fn()
			const onfailure = vi.fn()
			const onfinally = vi.fn()

			const handle = lambda({
				handle() {
					const ctx = getContext()

					ctx?.onSuccess(onsuccess)
					ctx?.onFailure(onfailure)
					ctx?.onFinally(onfinally)

					throw new Error()
				},
			})

			await expect(handle()).rejects.toThrow()

			expect(onsuccess).not.toHaveBeenCalled()
			expect(onfailure).toHaveBeenCalled()
			expect(onfinally).toHaveBeenCalled()
		})
	})
})
