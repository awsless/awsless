import { define, number, object, string } from '@awsless/dynamodb'
import { Input, Output, ValiError, dynamoDbStream, parse } from '../../../src'
import { EventName } from '../../../src/schema/aws/dynamodb-stream'

describe('DynamoDB Stream', () => {
	const table = define('name', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
		}),
	})

	const schema = dynamoDbStream(table)

	it('should allow structured input', () => {
		const result = parse(schema, {
			Records: [
				{
					eventName: 'MODIFY',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: { id: { N: '1' }, name: { S: 'name' } },
						// OldImage: { id: { N: '1' }, name: { S: 'name' } },
					},
				},
			],
		})

		expect(result).toStrictEqual([
			{
				event: 'MODIFY',
				keys: { id: 1 },
				new: { id: 1, name: 'name' },
				old: undefined,
			},
		])

		expect(() =>
			parse(schema, {
				Records: [
					{
						eventName: 'UNKNOWN',
						dynamodb: {
							Keys: { id: { N: '1' } },
						},
					},
				],
			})
		).toThrow(ValiError)
	})

	it('types', () => {
		expectTypeOf<Input<typeof schema>>().toEqualTypeOf<{
			Records: {
				eventName: EventName
				dynamodb: {
					Keys: unknown
					OldImage?: unknown
					NewImage?: unknown
				}
			}[]
		}>()

		expectTypeOf<Output<typeof schema>>().toEqualTypeOf<
			{
				event: EventName
				keys: { id: number }
				old?: {
					id?: number
					name?: string
				}
				new?: {
					id?: number
					name?: string
				}
			}[]
		>()
	})
})
