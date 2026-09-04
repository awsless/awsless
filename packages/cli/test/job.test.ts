import { describe, expect, it } from 'vitest'
import { JobsSchema } from '../src/feature/job/schema'
import { createTestApp, findStatements, listResources } from './_kit'

const code = { file: { nocheck: './export.ts' } }

describe('job', () => {
	it('defines an on demand fargate task without a service', () => {
		const { app, shared } = createTestApp({
			stacks: [{ name: 'stack-1', jobs: { export: { code } } }],
		})

		const task = listResources(app, 'aws_ecs_task_definition')[0]!

		expect(listResources(app, 'aws_ecs_cluster')[0]!.input.name).toBe('test-app-job')
		expect(task.input.family).toBe('test-app--stack-1--job--export')
		expect(task.input.volume).toBeUndefined()
		expect(listResources(app, 'aws_ecs_service')).toHaveLength(0)

		const [runTask] = findStatements(shared, 'ecs:RunTask')

		expect(runTask!.resources).toEqual(['arn:aws:ecs:us-east-1:123456789012:task-definition/test-app--stack-1--*'])
	})

	it('only passes the roles of the jobs to ecs', () => {
		const { shared } = createTestApp({
			stacks: [{ name: 'stack-1', jobs: { export: { code }, import: { code } } }],
		})

		// The task feature passes its own schedule role to the scheduler.
		const statement = findStatements(shared, 'iam:PassRole').find(statement =>
			JSON.stringify(statement.conditions).includes('ecs-tasks')
		)

		expect(statement).toBeDefined()
		expect(statement!.resources).toHaveLength(4)
		expect(statement!.resources).not.toContain('*')
		expect(statement!.conditions).toEqual({
			StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' },
		})
	})
	it('rejects the removed persistentStorage option instead of dropping it', () => {
		const result = JobsSchema.safeParse({ export: { code, persistentStorage: true } })

		expect(result.success).toBe(false)
		expect(JSON.stringify(result.error?.issues)).toContain('persistentStorage option was removed')
		expect(JobsSchema.safeParse({ export: { code } }).success).toBe(true)
	})
})
