import { sqsStruct } from '../src'
import { number, type, create } from '@awsless/validate'

describe('Struct', () => {
	it('should allow easy test input', () => {
		const struct = sqsStruct(type({ id: number() }))
		const result = create([{ id: 1 }], struct)

		expect(result).toStrictEqual([{ id: 1 }])
	})

	it('should allow sns structured input', () => {
		const struct = sqsStruct(type({ id: number() }))
		const result = create({
			Records: [{
				body: JSON.stringify({ id: 1 })
			}]
		}, struct)

		expect(result).toStrictEqual([{ id: 1 }])
	})
})
