import { CreateTableCommand, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Sorting', () => {
	let server: DynamoDBServer

	beforeAll(async () => {
		server = new DynamoDBServer()
		await server.listen()
	})

	afterAll(async () => {
		await server.stop()
	})

	beforeEach(() => {
		server.reset()
	})

	describe('Query sorting', () => {
		beforeEach(async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'SortTest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'N' },
						{ AttributeName: 'gsiPk', AttributeType: 'S' },
						{ AttributeName: 'gsiSk', AttributeType: 'N' },
					],
					GlobalSecondaryIndexes: [
						{
							IndexName: 'GSI1',
							KeySchema: [
								{ AttributeName: 'gsiPk', KeyType: 'HASH' },
								{ AttributeName: 'gsiSk', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)
		})

		it('should sort query results by sort key ascending (default)', async () => {
			const client = server.getClient()

			// Insert items in parallel to ensure insertion order doesn't matter
			await Promise.all([
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'user#1' }, sk: { N: '3' }, value: { S: 'third' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'user#1' }, sk: { N: '1' }, value: { S: 'first' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'user#1' }, sk: { N: '2' }, value: { S: 'second' } },
					})
				),
			])

			const result = await client.send(
				new QueryCommand({
					TableName: 'SortTest',
					KeyConditionExpression: 'pk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
					},
				})
			)

			const sortKeys = result.Items?.map(item => item.sk?.N)
			expect(sortKeys).toEqual(['1', '2', '3'])
		})

		it('should sort query results by sort key descending when ScanIndexForward is false', async () => {
			const client = server.getClient()

			await Promise.all([
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'user#1' }, sk: { N: '1' }, value: { S: 'first' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'user#1' }, sk: { N: '3' }, value: { S: 'third' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'user#1' }, sk: { N: '2' }, value: { S: 'second' } },
					})
				),
			])

			const result = await client.send(
				new QueryCommand({
					TableName: 'SortTest',
					KeyConditionExpression: 'pk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
					},
					ScanIndexForward: false,
				})
			)

			const sortKeys = result.Items?.map(item => item.sk?.N)
			expect(sortKeys).toEqual(['3', '2', '1'])
		})

		it('should sort GSI query results by index sort key ascending', async () => {
			const client = server.getClient()

			await Promise.all([
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'a' }, sk: { N: '1' }, gsiPk: { S: 'group#1' }, gsiSk: { N: '30' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'b' }, sk: { N: '2' }, gsiPk: { S: 'group#1' }, gsiSk: { N: '10' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'c' }, sk: { N: '3' }, gsiPk: { S: 'group#1' }, gsiSk: { N: '20' } },
					})
				),
			])

			const result = await client.send(
				new QueryCommand({
					TableName: 'SortTest',
					IndexName: 'GSI1',
					KeyConditionExpression: 'gsiPk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'group#1' },
					},
				})
			)

			const gsiSortKeys = result.Items?.map(item => item.gsiSk?.N)
			expect(gsiSortKeys).toEqual(['10', '20', '30'])
		})

		it('should sort GSI query results by index sort key descending', async () => {
			const client = server.getClient()

			await Promise.all([
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'a' }, sk: { N: '1' }, gsiPk: { S: 'group#1' }, gsiSk: { N: '30' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'b' }, sk: { N: '2' }, gsiPk: { S: 'group#1' }, gsiSk: { N: '10' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'SortTest',
						Item: { pk: { S: 'c' }, sk: { N: '3' }, gsiPk: { S: 'group#1' }, gsiSk: { N: '20' } },
					})
				),
			])

			const result = await client.send(
				new QueryCommand({
					TableName: 'SortTest',
					IndexName: 'GSI1',
					KeyConditionExpression: 'gsiPk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'group#1' },
					},
					ScanIndexForward: false,
				})
			)

			const gsiSortKeys = result.Items?.map(item => item.gsiSk?.N)
			expect(gsiSortKeys).toEqual(['30', '20', '10'])
		})

		it('should sort string sort keys correctly', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'StringSortTest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'S' },
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			await Promise.all([
				client.send(
					new PutItemCommand({
						TableName: 'StringSortTest',
						Item: { pk: { S: 'test' }, sk: { S: 'charlie' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'StringSortTest',
						Item: { pk: { S: 'test' }, sk: { S: 'alpha' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'StringSortTest',
						Item: { pk: { S: 'test' }, sk: { S: 'bravo' } },
					})
				),
			])

			const result = await client.send(
				new QueryCommand({
					TableName: 'StringSortTest',
					KeyConditionExpression: 'pk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'test' },
					},
				})
			)

			const sortKeys = result.Items?.map(item => item.sk?.S)
			expect(sortKeys).toEqual(['alpha', 'bravo', 'charlie'])
		})
	})

	describe('Scan sorting', () => {
		it('scan should return items in consistent order', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'ScanSortTest',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			await Promise.all([
				client.send(
					new PutItemCommand({
						TableName: 'ScanSortTest',
						Item: { id: { S: 'c' }, value: { N: '3' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'ScanSortTest',
						Item: { id: { S: 'a' }, value: { N: '1' } },
					})
				),
				client.send(
					new PutItemCommand({
						TableName: 'ScanSortTest',
						Item: { id: { S: 'b' }, value: { N: '2' } },
					})
				),
			])

			// Run scan multiple times to verify consistency
			const results: string[][] = []
			for (let i = 0; i < 3; i++) {
				const result = await client.send(new ScanCommand({ TableName: 'ScanSortTest' }))
				results.push(result.Items?.map(item => item.id?.S!) || [])
			}

			// All scans should return the same order
			expect(results[0]).toEqual(results[1])
			expect(results[1]).toEqual(results[2])
		})
	})
})
