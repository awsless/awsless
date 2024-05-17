import { define, number, object, string } from '@awsless/dynamodb'
import { Input, Output, ValiError, dynamoDbStream, parse } from '../../../src'

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
					},
				},
			],
		})

		expect(result).toStrictEqual([
			{
				event: 'modify',
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
				eventName: 'MODIFY' | 'REMOVE' | 'INSERT'
				dynamodb: {
					Keys: unknown
					OldImage?: unknown
					NewImage?: unknown
				}
			}[]
		}>()

		expectTypeOf<Output<typeof schema>>().toEqualTypeOf<
			{
				event: Lowercase<'MODIFY' | 'REMOVE' | 'INSERT'>
				keys: { id: number }
				old?: {
					id: number
					name: string
				}
				new?: {
					id: number
					name: string
				}
			}[]
		>()
	})
})
