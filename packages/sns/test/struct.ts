import { number, type, create } from 'superstruct'
import { snsInput, snsRecords, snsStruct } from '../src'

describe('structs', () => {
	it('snsStruct', () => {
		const struct = snsStruct(type({ id: number() }))
		const event = snsInput([{ id: 1 }])
		const result = create(event, struct)
		const records = snsRecords(result)

		expect(result.Records[0].Sns.Message).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{ id: 1 }])
	})
})
