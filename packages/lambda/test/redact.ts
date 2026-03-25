import { pipe, redact, string } from '@awsless/validate'
import { lambda } from '../src'

describe('Redaction support', () => {
	it('should redact input', async () => {
		process.env.LAMBDA_ENV = 'prod'

		const handle = lambda({
			schema: pipe(string(), redact()),
			handle() {
				throw new Error('Some error')
			},
		})

		const promise = handle('secret')

		await expect(promise).rejects.toThrow(Error)

		promise.catch(error => {
			expect(error.input).toBe('[REDACTED]')
		})
	})
})
