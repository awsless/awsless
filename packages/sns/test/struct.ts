import { number, type, create } from 'superstruct'
import { snsRecords, snsStruct } from '../src'

describe('structs', () => {
	it('snsStruct', () => {
		const struct = snsStruct(type({ id: number() }))
		const event = {
			Records: [
				{
					Sns: {
						TopicArn: 'topic',
						MessageId: '1',
						Message: '{ "id": 1 }',
						Timestamp: new Date().toISOString(),
					},
				},
			],
		}

		const result = create(event, struct)
		const records = snsRecords(result)

		expect(result.Records[0].Sns.Message).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{ id: 1 }])
	})
})
