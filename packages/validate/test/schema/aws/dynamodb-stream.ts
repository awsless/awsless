import { define, number, object, string } from '@awsless/dynamodb'
import { InferInput, InferOutput, ValiError, dynamoDbStream, parse } from '../../../src'

describe('DynamoDB Stream', () => {
	const table = define('name', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
		}),
	})

	const schema = dynamoDbStream(table)

	it('should allow insert payload', () => {
		const result = parse(schema, {
			Records: [
				{
					eventName: 'INSERT',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: { id: { N: '1' }, name: { S: 'name' } },
					},
				},
			],
		})

		expect(result).toStrictEqual([
			{
				event: 'insert',
				keys: { id: 1 },
				new: { id: 1, name: 'name' },
			},
		])
	})

	it('should allow modify payload', () => {
		const result = parse(schema, {
			Records: [
				{
					eventName: 'MODIFY',
					dynamodb: {
						Keys: { id: { N: '1' } },
						OldImage: { id: { N: '1' }, name: { S: 'hello' } },
						NewImage: { id: { N: '1' }, name: { S: 'world' } },
					},
				},
			],
		})

		expect(result).toStrictEqual([
			{
				event: 'modify',
				keys: { id: 1 },
				old: { id: 1, name: 'hello' },
				new: { id: 1, name: 'world' },
			},
		])
	})

	it('should allow remove payload', () => {
		const result = parse(schema, {
			Records: [
				{
					eventName: 'REMOVE',
					dynamodb: {
						Keys: { id: { N: '1' } },
						OldImage: { id: { N: '1' }, name: { S: 'name' } },
					},
				},
			],
		})

		expect(result).toStrictEqual([
			{
				event: 'remove',
				keys: { id: 1 },
				old: { id: 1, name: 'name' },
			},
		])
	})

	it('should throw for invalid key schema', () => {
		expect(() =>
			parse(schema, {
				Records: [
					{
						eventName: 'INSERT',
						dynamodb: {
							Keys: { unknown: { N: '1' } },
						},
					},
				],
			})
		).toThrow(TypeError)
	})

	it('should throw for invalid payload', () => {
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
		expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{
			Records: Array<{
				eventName: 'INSERT' | 'MODIFY' | 'REMOVE'
				dynamodb: {
					Keys: unknown
					OldImage?: unknown
					NewImage?: unknown
				}
			}>
		}>()

		expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<
			Array<{
				event: 'modify' | 'insert' | 'remove'
				keys: { id: number }
				old?: { id: number; name: string }
				new?: { id: number; name: string }
			}>
		>()
	})
})
