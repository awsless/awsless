import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements, listResources } from './_kit'

const code = { file: { nocheck: './consumer.ts' } }

describe('queue', () => {
	it('creates a fifo queue', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', queues: { jobs: { consumer: { code } } } }],
		})

		const queues = listResources(app, 'aws_sqs_queue')
		const queue = queues.find(meta => meta.input.name === 'test-app--stack-1--queue--jobs.fifo')!

		expect(queues).toHaveLength(1)
		expect(queue.input.fifoQueue).toBe(true)
	})

	it('maps the queue onto the bundle only with a consumer', () => {
		const withConsumer = createTestApp({
			stacks: [{ name: 'stack-1', queues: { jobs: { consumer: { code } } } }],
		})
		const withoutConsumer = createTestApp({
			stacks: [{ name: 'stack-1', queues: { jobs: {} } }],
		})

		expect(listResources(withConsumer.app, 'aws_lambda_event_source_mapping')).toHaveLength(1)
		expect(listResources(withoutConsumer.app, 'aws_lambda_event_source_mapping')).toHaveLength(0)
	})

	it('grants the app access to the queue', () => {
		const { shared } = createTestApp({
			stacks: [{ name: 'stack-1', queues: { jobs: { consumer: { code } } } }],
		})

		expect(findStatements(shared, 'sqs:SendMessage')).toHaveLength(1)
		expect(findStatements(shared, 'sqs:ReceiveMessage')).toHaveLength(1)
	})
})
