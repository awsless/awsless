import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements, listResources } from './_kit'

const code = { file: { nocheck: './server.ts' } }

describe('instance', () => {
	it('runs the program as a single fargate task with its own queue', () => {
		const { app, shared } = createTestApp({
			stacks: [{ name: 'stack-1', instances: { worker: { code } } }],
		})

		const task = listResources(app, 'aws_ecs_task_definition')[0]!
		const service = listResources(app, 'aws_ecs_service')[0]!
		const target = listResources(app, 'aws_appautoscaling_target')[0]!
		const queue = listResources(app, 'aws_sqs_queue')[0]!

		expect(listResources(app, 'aws_ecs_cluster')[0]!.input.name).toBe('test-app-instance')
		expect(task.input.family).toBe('test-app--stack-1--instance--worker')
		expect(task.input.cpu).toBe('256')
		expect(task.input.memory).toBe('512')
		expect(task.input.runtimePlatform.cpuArchitecture).toBe('ARM64')
		expect(service.input.desiredCount).toBe(1)
		expect(service.input.deploymentMinimumHealthyPercent).toBe(0)
		expect(target.input.minCapacity).toBe(1)
		expect(target.input.maxCapacity).toBe(1)
		expect(listResources(app, 'aws_appautoscaling_policy')).toHaveLength(0)
		expect(queue.input.name).toBe('test-app--stack-1--instance--worker')

		expect(findStatements(shared, 'sqs:SendMessage')).toHaveLength(1)
	})

	it('creates the roles & log group of the task', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', instances: { worker: { code, log: '3 days' } } }],
		})

		const roles = listResources(app, 'aws_iam_role').filter(
			meta => meta.input.description === 'test-app--stack-1--instance--worker'
		)
		const logGroup = listResources(app, 'aws_cloudwatch_log_group').find(
			meta => meta.input.name === '/aws/ecs/test-app--stack-1--instance--worker'
		)!

		expect(roles).toHaveLength(2)
		expect(roles.every(meta => meta.input.name.length <= 64)).toBe(true)
		expect(logGroup.input.retentionInDays).toBe(3)
	})

	it('disables logging with a zero retention', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', instances: { worker: { code, log: false } } }],
		})

		expect(listResources(app, 'aws_cloudwatch_log_group').some(meta => meta.input.name.startsWith('/aws/ecs/'))).toBe(
			false
		)
	})
})
