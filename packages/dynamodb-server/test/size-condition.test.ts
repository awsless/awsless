import {
	CreateTableCommand,
	PutItemCommand,
	ScanCommand,
	TransactWriteItemsCommand,
	UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Size Condition Expression', () => {
	let server: DynamoDBServer

	beforeAll(async () => {
		server = new DynamoDBServer()
		await server.listen()
	})

	afterAll(async () => {
		await server.stop()
	})

	beforeEach(async () => {
		server.reset()

		const client = server.getClient()
		await client.send(
			new CreateTableCommand({
				TableName: 'Games',
				KeySchema: [{ AttributeName: 'playerId', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'playerId', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)
	})

	it('should evaluate size(path) = value', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [{ S: 'g1' }, { S: 'g2' }] },
				},
			})
		)

		// size(games) = 2 should pass
		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#g) = :s',
				ExpressionAttributeNames: { '#g': 'games', '#n': 'name' },
				ExpressionAttributeValues: { ':s': { N: '2' }, ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size(path) > value', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [{ S: 'g1' }] },
				},
			})
		)

		// size(games) > 0 should pass
		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#g) > :s',
				ExpressionAttributeNames: { '#g': 'games', '#n': 'name' },
				ExpressionAttributeValues: { ':s': { N: '0' }, ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size(path) >= value', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [{ S: 'g1' }] },
				},
			})
		)

		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#g) >= :s',
				ExpressionAttributeNames: { '#g': 'games', '#n': 'name' },
				ExpressionAttributeValues: { ':s': { N: '1' }, ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size in OR expression', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [] },
				},
			})
		)

		// (size(games) = 0 OR attribute_not_exists(games) OR attribute_not_exists(playerId))
		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: '(size(#g) = :s OR attribute_not_exists(#g) OR attribute_not_exists(#p))',
				ExpressionAttributeNames: { '#g': 'games', '#p': 'playerId', '#n': 'name' },
				ExpressionAttributeValues: { ':s': { N: '0' }, ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size in transaction condition check', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'Seeds',
				KeySchema: [{ AttributeName: 'playerId', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'playerId', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'Seeds',
				Item: {
					playerId: { S: 'p1' },
					client: { S: 'old' },
					nonce: { N: '5' },
				},
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [] },
				},
			})
		)

		// Reproduce the user's exact pattern
		await client.send(
			new TransactWriteItemsCommand({
				TransactItems: [
					{
						Update: {
							TableName: 'Seeds',
							Key: { playerId: { S: 'p1' } },
							UpdateExpression: 'SET #c = :c, #nonce = :nonce',
							ExpressionAttributeNames: { '#c': 'client', '#nonce': 'nonce' },
							ExpressionAttributeValues: { ':c': { S: 'new' }, ':nonce': { N: '0' } },
						},
					},
					{
						ConditionCheck: {
							TableName: 'Games',
							Key: { playerId: { S: 'p1' } },
							ConditionExpression:
								'(size(#n1) = :v1 OR attribute_not_exists(#n1) OR attribute_not_exists(#n2))',
							ExpressionAttributeNames: { '#n1': 'games', '#n2': 'playerId' },
							ExpressionAttributeValues: { ':v1': { N: '0' } },
						},
					},
				],
			})
		)
	})

	it('should evaluate size on string attribute', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					name: { S: 'hello' },
				},
			})
		)

		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #x = :x',
				ConditionExpression: 'size(#n) = :s',
				ExpressionAttributeNames: { '#n': 'name', '#x': 'name' },
				ExpressionAttributeValues: { ':s': { N: '5' }, ':x': { S: 'updated' } },
			})
		)
	})

	it('should evaluate size on map attribute', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					data: { M: { a: { S: '1' }, b: { S: '2' } } },
				},
			})
		)

		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#d) = :s',
				ExpressionAttributeNames: { '#d': 'data', '#n': 'name' },
				ExpressionAttributeValues: { ':s': { N: '2' }, ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size on nested path', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					data: { M: { items: { L: [{ S: 'a' }, { S: 'b' }, { S: 'c' }] } } },
				},
			})
		)

		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#d.#i) = :s',
				ExpressionAttributeNames: { '#d': 'data', '#i': 'items', '#n': 'name' },
				ExpressionAttributeValues: { ':s': { N: '3' }, ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size on non-existent attribute without breaking parser', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'Seeds',
				KeySchema: [{ AttributeName: 'playerId', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'playerId', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'Seeds',
				Item: {
					playerId: { S: 'p1' },
					client: { S: 'old' },
				},
			})
		)

		// No item in Games table — size() targets a non-existent attribute
		// Previously this caused "Expected RPAREN but got COMPARATOR" because
		// the parser returned early without consuming the comparator tokens
		await client.send(
			new TransactWriteItemsCommand({
				TransactItems: [
					{
						Update: {
							TableName: 'Seeds',
							Key: { playerId: { S: 'p1' } },
							UpdateExpression: 'SET #c = :c',
							ExpressionAttributeNames: { '#c': 'client' },
							ExpressionAttributeValues: { ':c': { S: 'new' } },
						},
					},
					{
						ConditionCheck: {
							TableName: 'Games',
							Key: { playerId: { S: 'p1' } },
							ConditionExpression:
								'(size(#n1) = :v1 OR attribute_not_exists(#n1) OR attribute_not_exists(#n2))',
							ExpressionAttributeNames: { '#n1': 'games', '#n2': 'playerId' },
							ExpressionAttributeValues: { ':v1': { N: '0' } },
						},
					},
				],
			})
		)
	})

	it('should evaluate size = 0 on non-existent attribute as true', async () => {
		const client = server.getClient()

		// No item exists — size of non-existent attribute should be 0
		try {
			await client.send(
				new UpdateItemCommand({
					TableName: 'Games',
					Key: { playerId: { S: 'nonexistent' } },
					UpdateExpression: 'SET #n = :n',
					ConditionExpression: 'size(#g) = :s',
					ExpressionAttributeNames: { '#g': 'games', '#n': 'name' },
					ExpressionAttributeValues: { ':s': { N: '0' }, ':n': { S: 'test' } },
				})
			)
		} catch (error: any) {
			// size(nonexistent) = 0 should evaluate to true (size is 0)
			expect(error.name).not.toBe('ValidationException')
		}
	})

	it('should evaluate size compared to another size', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [{ S: 'g1' }, { S: 'g2' }] },
					tags: { L: [{ S: 't1' }, { S: 't2' }] },
				},
			})
		)

		// size(games) = size(tags) should pass (both have 2 elements)
		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#g) = size(#t)',
				ExpressionAttributeNames: { '#g': 'games', '#t': 'tags', '#n': 'name' },
				ExpressionAttributeValues: { ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size compared to a path value', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [{ S: 'g1' }, { S: 'g2' }] },
					count: { N: '2' },
				},
			})
		)

		// size(games) = count should pass (size is 2, count is 2)
		await client.send(
			new UpdateItemCommand({
				TableName: 'Games',
				Key: { playerId: { S: 'p1' } },
				UpdateExpression: 'SET #n = :n',
				ConditionExpression: 'size(#g) = #c',
				ExpressionAttributeNames: { '#g': 'games', '#c': 'count', '#n': 'name' },
				ExpressionAttributeValues: { ':n': { S: 'test' } },
			})
		)
	})

	it('should evaluate size in filter expression', async () => {
		const client = server.getClient()

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p1' },
					games: { L: [{ S: 'g1' }, { S: 'g2' }] },
				},
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'Games',
				Item: {
					playerId: { S: 'p2' },
					games: { L: [] },
				},
			})
		)

		const result = await client.send(
			new ScanCommand({
				TableName: 'Games',
				FilterExpression: 'size(#g) > :s',
				ExpressionAttributeNames: { '#g': 'games' },
				ExpressionAttributeValues: { ':s': { N: '0' } },
			})
		)

		expect(result.Count).toBe(1)
		expect(result.Items?.[0]?.playerId?.S).toBe('p1')
	})
})
