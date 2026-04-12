import { RunTaskCommand } from '@aws-sdk/client-ecs'
import { stringify } from '@awsless/json'
import { mockEcs, ecsClient, runTask } from '../src'

describe('ECS Mock', () => {
	const ecs = mockEcs({
		'app--stack--job--echo': () => {},
	})

	const client = ecsClient()

	it('should run task', async () => {
		await client.send(
			new RunTaskCommand({
				taskDefinition: 'app--stack--job--echo',
				overrides: {
					containerOverrides: [
						{
							name: 'container-echo',
							environment: [{ name: 'PAYLOAD', value: stringify({ message: 'hello' }) }],
						},
					],
				},
			})
		)

		expect(ecs['app--stack--job--echo']).toBeCalledTimes(1)
		expect(ecs['app--stack--job--echo']).toBeCalledWith({ message: 'hello' })
	})

	it('should return task arn', async () => {
		const result = await client.send(
			new RunTaskCommand({
				taskDefinition: 'app--stack--job--echo',
				overrides: {
					containerOverrides: [
						{
							name: 'container-echo',
							environment: [{ name: 'PAYLOAD', value: stringify('test') }],
						},
					],
				},
			})
		)

		expect(result.tasks).toHaveLength(1)
		expect(result.tasks?.[0]?.taskArn).toBeDefined()
		expect(result.failures).toHaveLength(0)
	})

	it('should throw for unknown task definition', async () => {
		const promise = client.send(
			new RunTaskCommand({
				taskDefinition: 'unknown',
				overrides: { containerOverrides: [{ environment: [] }] },
			})
		)

		await expect(promise).rejects.toThrow(TypeError)
	})
})

describe('runTask', () => {
	mockEcs({
		'app--stack--job--worker': () => {},
	})

	it('should run task via helper', async () => {
		const result = await runTask({
			cluster: 'app-job',
			taskDefinition: 'app--stack--job--worker',
			subnets: ['subnet-1'],
			securityGroups: ['sg-1'],
			container: 'container-worker',
			payload: { data: 1 },
		})

		expect(result.taskArn).toBeDefined()
	})

	it('should run task without payload', async () => {
		const result = await runTask({
			cluster: 'app-job',
			taskDefinition: 'app--stack--job--worker',
			subnets: ['subnet-1'],
			securityGroups: ['sg-1'],
			container: 'container-worker',
		})

		expect(result.taskArn).toBeDefined()
	})
})
