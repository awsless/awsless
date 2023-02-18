
import { mask, number, object } from 'superstruct'
import { describe, it, expect } from 'vitest'
import { dynamodbStreamRecords, dynamodbStreamStruct, elbRequest, elbStruct, snsRecords, snsStruct, sqsRecords, sqsStruct } from '../src'

describe('structs', () => {

	// it('elbStruct', async () => {
	// 	const struct = elbStruct({
	// 		query: object({
	// 			id: string()
	// 		})
	// 	})

	// 	const event = {
	// 		queryStringParameters: { id: '1' },
	// 		headers: { authorization: 'token' },
	// 	}

	// 	const result = create(event, struct)
	// 	const request = elbRequest(result)

	// 	expect(result).toStrictEqual({
	// 		headers: { authorization: 'token' },
	// 		queryStringParameters: { id: '1' },
	// 		body: undefined,
	// 	})

	// 	expect(request).toStrictEqual({
	// 		headers: { authorization: 'token' },
	// 		query: { id: '1' },
	// 		body: undefined,
	// 	})
	// })

	it('dynamodbStreamStruct', () => {
		const struct = dynamodbStreamStruct({ newImage: object({ id: number() }) })
		const event = { Records: [ { eventName: 'MODIFY', dynamodb: { SequenceNumber: '1', NewImage: { id: { N: '1' } } } } ] }

		const result = mask(event, struct)
		const records = dynamodbStreamRecords(result)

		expect(result.Records[0].dynamodb.NewImage).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{
			event: 'MODIFY',
			sequence: '1',
			newImage: { id: 1 },
			oldImage: undefined,
			keys: undefined,
		}])
	})

	it('snsStruct', () => {
		const struct = snsStruct(object({ id: number() }))
		const event = { Records: [{ Sns: {
			TopicArn: 'topic',
			MessageId: '1',
			Message: '{ "id": 1 }',
			Timestamp: new Date().toISOString()
		} } ] }

		const result = mask(event, struct)
		const records = snsRecords(result)

		expect(result.Records[0].Sns.Message).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{ id: 1 }])
	})

	it('sqsStruct', () => {
		const struct = sqsStruct(object({ id: number() }))

		const record = {
			messageId: '1',
			body: JSON.stringify({ id: 1 }),
			messageAttributes: {}
		}

		const event = { Records: [record, record] }

		const result = mask(event, struct)
		const records = sqsRecords(result)

		expect(result.Records[0].body).toStrictEqual({ id: 1 })
		expect(records).toStrictEqual([{ id: 1 }, { id: 1 }])
	})
})
