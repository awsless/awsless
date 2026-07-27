import { resolveInputs } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { compactPolicyStatements, PolicyStatement } from '../src/feature/bundle/policy'
import { createTestApp } from './_kit'

// Resolve the bundle role statements for a single action. Most other
// statements depend on unresolved resource outputs, so they can only be
// resolved during a deployment.
const resolveBundleStatements = async (
	shared: ReturnType<typeof createTestApp>['shared'],
	action: string
): Promise<PolicyStatement[]> => {
	const bundle = shared.get('bundle', 'main')
	const statements = Array.from(bundle.statements).filter(statement => statement.actions.includes(action))
	const resolved = await resolveInputs(statements)

	return resolved as PolicyStatement[]
}

describe('bundle policy', () => {
	it('should union the resources of equal statements', () => {
		const statements = compactPolicyStatements([
			{ actions: ['ssm:GetParameter'], resources: ['arn:a', 'arn:b'] },
			{ actions: ['ssm:GetParameter'], resources: ['arn:b', 'arn:c'] },
		])

		expect(statements).toStrictEqual([
			{ actions: ['ssm:GetParameter'], resources: ['arn:a', 'arn:b', 'arn:c'] },
		])
	})

	it('should not merge statements with different effects or conditions', () => {
		const statements = compactPolicyStatements([
			{ actions: ['s3:GetObject'], resources: ['arn:a'] },
			{ effect: 'deny', actions: ['s3:GetObject'], resources: ['arn:b'] },
			{ actions: ['s3:GetObject'], resources: ['arn:c'], conditions: { Bool: { 'aws:SecureTransport': 'true' } } },
		])

		expect(statements).toHaveLength(3)
	})

	it('should drop resources covered by a wildcard sibling', () => {
		const statements = compactPolicyStatements([
			{ actions: ['ssm:GetParameter'], resources: ['arn:x:parameter/app/*'] },
			{ actions: ['ssm:GetParameter'], resources: ['arn:x:parameter/app/one', 'arn:y:other'] },
		])

		expect(statements).toStrictEqual([
			{ actions: ['ssm:GetParameter'], resources: ['arn:x:parameter/app/*', 'arn:y:other'] },
		])
	})

	it('should union the values of a single StringEquals condition', () => {
		const statements = compactPolicyStatements([
			{
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
				conditions: { StringEquals: { 'cloudwatch:namespace': 'awsless/app/stack-1' } },
			},
			{
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
				conditions: { StringEquals: { 'cloudwatch:namespace': 'awsless/app/stack-2' } },
			},
		])

		expect(statements).toStrictEqual([
			{
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
				conditions: {
					StringEquals: {
						'cloudwatch:namespace': ['awsless/app/stack-1', 'awsless/app/stack-2'],
					},
				},
			},
		])
	})

	it('should keep a lone StringEquals condition untouched', () => {
		const statement = {
			actions: ['cloudwatch:PutMetricData'],
			resources: ['*'],
			conditions: { StringEquals: { 'cloudwatch:namespace': 'awsless/app/stack-1' } },
		}

		expect(compactPolicyStatements([statement])).toStrictEqual([statement])
	})

	it('should not merge the values of other condition operators', () => {
		const statements = compactPolicyStatements([
			{ actions: ['s3:GetObject'], resources: ['*'], conditions: { StringLike: { 's3:prefix': 'a/*' } } },
			{ actions: ['s3:GetObject'], resources: ['*'], conditions: { StringLike: { 's3:prefix': 'b/*' } } },
		])

		expect(statements).toHaveLength(2)
	})

	it('should merge the metric grants of multiple stacks into one statement', async () => {
		const { shared } = createTestApp({}, undefined, [
			{ name: 'stack-1', metrics: { latency: { type: 'duration' } } },
			{ name: 'stack-2', metrics: { volume: { type: 'number' } } },
		])

		const statements = await resolveBundleStatements(shared, 'cloudwatch:PutMetricData')
		const compacted = compactPolicyStatements(statements)

		expect(statements).toHaveLength(2)
		expect(compacted).toHaveLength(1)
		expect(compacted[0]!.conditions).toStrictEqual({
			StringEquals: {
				'cloudwatch:namespace': ['awsless/test-app/stack-1', 'awsless/test-app/stack-2'],
			},
		})
	})

	it('should not grant metric permissions to stacks without metrics', async () => {
		const { shared } = createTestApp({}, undefined, [{ name: 'stack-1' }])

		const statements = await resolveBundleStatements(shared, 'cloudwatch:PutMetricData')

		expect(statements).toHaveLength(0)
	})

	it('should only grant the app level config wildcard', async () => {
		const { shared } = createTestApp({}, undefined, [{ name: 'stack-1', configs: ['secret'] }])

		const statements = await resolveBundleStatements(shared, 'ssm:GetParameter')

		expect(statements).toHaveLength(1)
		expect(statements[0]!.resources.every(resource => resource.endsWith('/*'))).toBe(true)
	})
})
