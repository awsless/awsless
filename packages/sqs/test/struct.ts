import { sqsInput, sqsRecords, sqsStruct } from '../src'
import { number, type, create } from '@awsless/validate'

describe('Struct', () => {
	it('sqsStruct', () => {
		assertType<number>(1)

		const struct = sqsStruct(type({ id: number() }))
		const event = sqsInput([{ id: 1 }, { id: 1 }], { foo: 'bar' })

		const result = create(event, struct)
		const records = sqsRecords(result)

		expect(result.Records[0].body).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{ id: 1 }, { id: 1 }])
	})
})
