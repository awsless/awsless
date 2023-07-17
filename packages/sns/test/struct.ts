import { number, type, create } from 'superstruct'
import { snsStruct } from '../src'

describe('structs', () => {
	it('should allow easy test input', () => {
		const struct = snsStruct(type({ id: number() }))
		const result = create([{ id: 1 }], struct)

		expect(result).toStrictEqual([{ id: 1 }])
	})

	it('should allow sns structured input', () => {
		const struct = snsStruct(type({ id: number() }))
		const result = create({
			Records: [{
				Sns: {
					Message: JSON.stringify({ id: 1 })
				}
			}]
		}, struct)

		expect(result).toStrictEqual([{ id: 1 }])
	})
})
