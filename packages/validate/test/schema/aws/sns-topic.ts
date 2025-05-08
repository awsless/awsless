import { array, Input, number, object, Output, parse, snsTopic, ValiError } from '../../../src'

describe('SNS Topic', () => {
	const schema = snsTopic(object({ id: number() }))

	it('should allow easy test input', () => {
		const result = parse(schema, { id: 1 })

		expect(result).toStrictEqual([{ id: 1 }])
		expect(() => parse(schema, { id: '1' })).toThrow(ValiError)
	})

	it('should allow structured input', () => {
		const schema = snsTopic(object({ id: number() }))
		const result = parse(schema, {
			Records: [
				{
					Sns: {
						Message: JSON.stringify({ id: 1 }),
					},
				},
			],
		})

		expect(result).toStrictEqual([{ id: 1 }])
	})

	it('should allow array schemas', () => {
		const result = parse(snsTopic(array(object({ id: number() }))), [{ id: 1 }])

		expect(result).toStrictEqual([[{ id: 1 }]])
		expect(() => parse(schema, [{ id: '1' }])).toThrow(ValiError)
	})

	it('types', () => {
		expectTypeOf<Output<typeof schema>>().toEqualTypeOf<{ id: number }[]>()
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<
			| { id: number }
			| { id: number }[]
			| {
					Records: {
						Sns: {
							Message: string | { id: number }
						}
					}[]
			  }
		>()
	})
})
