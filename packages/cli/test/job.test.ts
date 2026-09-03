import { describe, expect, it } from 'vitest'
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
		expect(listResources(app, 'aws_efs_file_system')).toHaveLength(0)

		expect(findStatements(shared, 'ecs:RunTask')).toHaveLength(1)
	})

	it('only passes the roles of the jobs to ecs', () => {
		const { shared } = createTestApp({
			stacks: [{ name: 'stack-1', jobs: { export: { code }, import: { code } } }],
		})

		// The task feature passes its own schedule role, without a condition.
		const statement = findStatements(shared, 'iam:PassRole').find(statement => statement.conditions)

		expect(statement).toBeDefined()
		expect(statement!.resources).toHaveLength(4)
		expect(statement!.resources).not.toContain('*')
		expect(statement!.conditions).toEqual({
			StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' },
		})
	})

	it('mounts a persistent volume when asked', () => {
		const { app, shared } = createTestApp({
			stacks: [{ name: 'stack-1', jobs: { export: { code, persistentStorage: true } } }],
		})

		const task = listResources(app, 'aws_ecs_task_definition')[0]!

		expect(listResources(app, 'aws_efs_file_system')).toHaveLength(1)
		expect(listResources(app, 'aws_efs_access_point')).toHaveLength(1)
		expect(task.input.volume).toHaveLength(1)
		expect(shared.get('job', 'persistent-storage-file-system-id')).toBeDefined()
	})
})
