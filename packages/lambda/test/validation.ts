import { number, pipe, transform } from '@awsless/validate'
import { ValidationError, lambda } from '../src'

describe('Validation', () => {
	it('should validate input', async () => {
		const handle = lambda({
			schema: pipe(
				number(),
				transform(v => v.toString())
			),
			handle(input) {
				expectTypeOf(input).toEqualTypeOf<string>()
				expect(input).toBeTypeOf('string')
				return input
			},
		})

		const result = await handle(1)

		expectTypeOf(result).toEqualTypeOf<string>()
		expect(result).toBe('1')

		await expect(
			// @ts-ignore
			handle()
		).rejects.toThrow(ValidationError)
	})

	// it('should validate input', async () => {
	// 	const handle = lambda({
	// 		schema: duration([minDuration(seconds(1))]),
	// 		handle(input) {},
	// 	})

	// 	const result = await handle('0 minutes')
	// })
})
