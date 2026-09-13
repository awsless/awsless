import { describe, expect, it } from 'vitest'
import { StackSchema } from '../src/config/stack'
import { formatTableKeys } from '../src/feature/table/util'
import { createTestApp, findStatements, listResources } from './_kit'

const code = { file: { nocheck: './stream.ts' } }

describe('table', () => {
	it('creates the table with its keys & ttl', () => {
		const { app, shared } = createTestApp({
			stacks: [{ name: 'stack-1', tables: { tasks: { hash: 'id', sort: 'createdAt', ttl: 'expires' } } }],
		})

		const table = listResources(app, 'aws_dynamodb_table')[0]!

		expect(table.input.name).toBe('test-app--stack-1--table--tasks')
		expect(table.input.hashKey).toBe('id')
		expect(table.input.rangeKey).toBe('createdAt')
		expect(table.input.ttl).toEqual({ attributeName: 'expires', enabled: true })
		expect(table.input.streamEnabled).toBe(false)
		expect(listResources(app, 'aws_lambda_event_source_mapping')).toHaveLength(0)

		expect(findStatements(shared, 'dynamodb:PutItem')).toHaveLength(1)
	})

	it('streams changes into the bundle with partial batch failures', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					tables: { tasks: { hash: 'id', stream: { type: 'new-image', consumer: { code } } } },
				},
			],
		})

		const table = listResources(app, 'aws_dynamodb_table')[0]!
		const mapping = listResources(app, 'aws_lambda_event_source_mapping')[0]!

		expect(table.input.streamEnabled).toBe(true)
		expect(table.input.streamViewType).toBe('NEW_IMAGE')
		expect(mapping.input.functionResponseTypes).toEqual(['ReportBatchItemFailures'])
		expect(mapping.input.startingPosition).toBe('LATEST')
		expect(mapping.input.destinationConfig).toBeUndefined()
	})

	it('reports stream failures to the on-failure bucket', () => {
		const { app } = createTestApp({
			app: { onFailure: { consumer: { code: { file: { nocheck: './on-failure.ts' } } } } },
			stacks: [
				{
					name: 'stack-1',
					tables: { tasks: { hash: 'id', stream: { type: 'keys-only', consumer: { code } } } },
				},
			],
		})

		const mapping = listResources(app, 'aws_lambda_event_source_mapping').find(
			meta => meta.input.startingPosition === 'LATEST'
		)!

		expect(mapping.input.destinationConfig).toBeDefined()
	})

	it('derives the runtime keys env from the stack config', () => {
		const stack = StackSchema.parse({
			name: 'stack-1',
			tables: {
				tasks: {
					hash: 'id',
					sort: 'createdAt',
					indexes: { byUser: { hash: 'userId', sort: 'createdAt' } },
				},
			},
		})

		expect(formatTableKeys(stack.tables!.tasks!)).toEqual({
			hash: 'id',
			sort: 'createdAt',
			indexes: { byUser: { hash: ['userId'], sort: ['createdAt'] } },
		})
	})
})
