import { sqsInput, sqsRecords, sqsStruct } from '../src'
import { number, type, create } from '@awsless/validate'

describe('Struct', () => {
	it('sqsStruct', () => {
		const struct = sqsStruct(type({ id: number() }))

		// const record = {
		// 	messageId: '1',
		// 	body: JSON.stringify({ id: 1 }),
		// 	messageAttributes: {},
		// }

		const event = sqsInput([{ id: 1 }])

		const result = create(event, struct)
		const records = sqsRecords(result)

		expect(result.Records[0].body).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{ id: 1 }, { id: 1 }])
	})
})
