import { ExpectedError, getContext, lambda, runInvocation } from '../src'

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

		it('logs a failure before its failure & finally callbacks', async () => {
			const calls: string[] = []

			const handle = lambda({
				logger: async () => {
					calls.push('log')
				},
				handle() {
					const ctx = getContext()

					ctx?.onFailure(() => calls.push('failure'))
					ctx?.onFinally(() => calls.push('finally'))

					throw new Error()
				},
			})

			await expect(handle()).rejects.toThrow()

			expect(calls).toStrictEqual(['log', 'failure', 'finally'])
		})

		it('runs the finally callbacks when a logger fails', async () => {
			const onfinally = vi.fn()

			const handle = lambda({
				logger: async () => {
					throw new Error('logger')
				},
				handle() {
					getContext()?.onFinally(onfinally)

					throw new Error('handler')
				},
			})

			await expect(handle()).rejects.toThrow('logger')

			expect(onfinally).toHaveBeenCalled()
		})

		it('finishes once, a second call waiting for the first', async () => {
			const calls: string[] = []

			const invocation = await runInvocation({
				input: undefined,
				raw: undefined,
				handle(_, context) {
					context.onFinally(async () => {
						await new Promise(resolve => setTimeout(resolve, 10))
						calls.push('finally')
					})
				},
			})

			void invocation.finishInvocation()
			await invocation.finishInvocation()

			expect(calls).toStrictEqual(['finally'])
		})

		it('fails a run whose success callback throws', async () => {
			const onfailure = vi.fn()
			const onfinally = vi.fn()

			const handle = lambda({
				handle() {
					const ctx = getContext()

					ctx?.onSuccess(() => {
						throw new Error('success callback')
					})
					ctx?.onFailure(onfailure)
					ctx?.onFinally(onfinally)
				},
			})

			await expect(handle()).rejects.toThrow('success callback')

			expect(onfailure).toHaveBeenCalled()
			expect(onfinally).toHaveBeenCalled()
		})

		describe('outside tests', () => {
			beforeEach(() => {
				vi.stubEnv('LAMBDA_ENV', 'production')
			})

			afterEach(() => {
				vi.unstubAllEnvs()
			})

			const failInSuccessCallback = (error: Error) => {
				return lambda({
					handle() {
						getContext()?.onSuccess(() => {
							throw error
						})
					},
				})
			}

			it('answers an expected error from a success callback as an error response', async () => {
				const handle = failInSuccessCallback(new ExpectedError('conflict', 'Taken already'))

				await expect(handle()).resolves.toMatchObject({
					__error__: { type: 'conflict', message: 'Taken already' },
				})
			})

			it("throws any other error from a success callback with the invocation's input", async () => {
				const handle = failInSuccessCallback(new Error('success callback'))

				await expect(handle({ id: 1 })).rejects.toMatchObject({
					message: 'success callback',
					input: { id: 1 },
				})
			})
		})
	})
})
