import { Input, number, object, Output, parse, sqsQueue, ValiError } from '../../../src'

describe('SQS Queue', () => {
	const schema = sqsQueue(object({ id: number() }))

	it('should allow easy test input', () => {
		const result = parse(schema, { id: 1 })

		expect(result).toStrictEqual([{ id: 1 }])
		expect(() => parse(schema, { id: '1' })).toThrow(ValiError)
	})

	it('should allow structured input', () => {
		const result = parse(schema, {
			Records: [
				{
					body: JSON.stringify({ id: 1 }),
				},
			],
		})

		expect(result).toStrictEqual([{ id: 1 }])
	})

	it('types', () => {
		expectTypeOf<Output<typeof schema>>().toEqualTypeOf<{ id: number }[]>()
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<
			| { id: number }
			| { id: number }[]
			| {
					Records: {
						body: string | { id: number }
					}[]
			  }
		>()
	})
})
