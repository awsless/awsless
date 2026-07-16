import { formatPolicyDocument, mergePolicyStatements } from '../src/util/policy.js'

describe('merge policy statements', () => {
	it('should merge statements with the same actions into one statement', () => {
		const result = mergePolicyStatements([
			{ actions: ['dynamodb:GetItem', 'dynamodb:PutItem'], resources: ['arn:table/one'] },
			{ actions: ['dynamodb:GetItem', 'dynamodb:PutItem'], resources: ['arn:table/two'] },
			{ actions: ['dynamodb:GetItem', 'dynamodb:PutItem'], resources: ['arn:table/three'] },
		])

		expect(result).toStrictEqual([
			{
				effect: 'allow',
				actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
				resources: ['arn:table/one', 'arn:table/two', 'arn:table/three'],
				conditions: undefined,
			},
		])
	})

	it('should merge statements regardless of the action order', () => {
		const result = mergePolicyStatements([
			{ actions: ['s3:PutObject', 's3:GetObject'], resources: ['arn:bucket/one'] },
			{ actions: ['s3:GetObject', 's3:PutObject'], resources: ['arn:bucket/two'] },
		])

		expect(result).toHaveLength(1)
		expect(result[0]!.resources).toStrictEqual(['arn:bucket/one', 'arn:bucket/two'])
	})

	it('should dedupe repeated actions & resources', () => {
		const result = mergePolicyStatements([
			{ actions: ['ssm:GetParameter', 'ssm:GetParameter'], resources: ['arn:param/max-bet'] },
			{ actions: ['ssm:GetParameter'], resources: ['arn:param/max-bet', 'arn:param/max-profit'] },
		])

		expect(result).toStrictEqual([
			{
				effect: 'allow',
				actions: ['ssm:GetParameter'],
				resources: ['arn:param/max-bet', 'arn:param/max-profit'],
				conditions: undefined,
			},
		])
	})

	it('should not merge statements with different actions', () => {
		const result = mergePolicyStatements([
			{ actions: ['dynamodb:Query'], resources: ['arn:table/one'] },
			{ actions: ['dynamodb:Scan'], resources: ['arn:table/one'] },
		])

		expect(result).toHaveLength(2)
	})

	it('should not merge statements with a different effect', () => {
		const result = mergePolicyStatements([
			{ effect: 'allow', actions: ['s3:GetObject'], resources: ['arn:bucket/one'] },
			{ effect: 'deny', actions: ['s3:GetObject'], resources: ['arn:bucket/two'] },
		])

		expect(result).toHaveLength(2)
	})

	it('should not merge statements with different conditions', () => {
		const result = mergePolicyStatements([
			{
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
				conditions: { StringEquals: { 'cloudwatch:namespace': 'app/one' } },
			},
			{
				actions: ['cloudwatch:PutMetricData'],
				resources: ['*'],
				conditions: { StringEquals: { 'cloudwatch:namespace': 'app/two' } },
			},
		])

		expect(result).toHaveLength(2)
	})

	it('should merge statements with the same conditions regardless of key order', () => {
		const result = mergePolicyStatements([
			{
				actions: ['s3:PutObject'],
				resources: ['arn:bucket/one'],
				conditions: { StringEquals: { 's3:ResourceAccount': '123', 'aws:SourceVpc': 'vpc-1' } },
			},
			{
				actions: ['s3:PutObject'],
				resources: ['arn:bucket/two'],
				conditions: { StringEquals: { 'aws:SourceVpc': 'vpc-1', 's3:ResourceAccount': '123' } },
			},
		])

		expect(result).toHaveLength(1)
		expect(result[0]!.resources).toStrictEqual(['arn:bucket/one', 'arn:bucket/two'])
	})

	it('should preserve the first occurrence order of statements', () => {
		const result = mergePolicyStatements([
			{ actions: ['logs:PutLogEvents'], resources: ['arn:log/one'] },
			{ actions: ['dynamodb:Query'], resources: ['arn:table/one'] },
			{ actions: ['logs:PutLogEvents'], resources: ['arn:log/two'] },
		])

		expect(result.map(s => s.actions[0])).toStrictEqual(['logs:PutLogEvents', 'dynamodb:Query'])
	})
})

describe('format policy document', () => {
	it('should format merged statements as an IAM policy document', () => {
		const result = formatPolicyDocument([
			{ actions: ['dynamodb:GetItem'], resources: ['arn:table/one'] },
			{ actions: ['dynamodb:GetItem'], resources: ['arn:table/two'] },
			{
				effect: 'deny',
				actions: ['s3:GetObject'],
				resources: ['arn:bucket/one'],
				conditions: { StringEquals: { 's3:ResourceAccount': '123' } },
			},
		])

		expect(result).toStrictEqual({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: ['dynamodb:GetItem'],
					Resource: ['arn:table/one', 'arn:table/two'],
					Condition: undefined,
				},
				{
					Effect: 'Deny',
					Action: ['s3:GetObject'],
					Resource: ['arn:bucket/one'],
					Condition: { StringEquals: { 's3:ResourceAccount': '123' } },
				},
			],
		})
	})

	it('should drop undefined conditions when serialized to json', () => {
		const json = JSON.stringify(formatPolicyDocument([{ actions: ['s3:GetObject'], resources: ['arn:bucket/one'] }]))

		expect(json).not.toContain('Condition')
	})

	it('should significantly shrink a policy with many per-resource statements', () => {
		const actions = [
			'dynamodb:DescribeTable',
			'dynamodb:PutItem',
			'dynamodb:GetItem',
			'dynamodb:UpdateItem',
			'dynamodb:DeleteItem',
			'dynamodb:TransactWrite',
			'dynamodb:BatchWriteItem',
			'dynamodb:BatchGetItem',
			'dynamodb:ConditionCheckItem',
			'dynamodb:Query',
			'dynamodb:Scan',
		]

		const statements = Array.from({ length: 15 }, (_, i) => ({
			actions,
			resources: [`arn:aws:dynamodb:eu-west-1:123456789:table/app--stack--table--${i}`],
		}))

		const before = JSON.stringify({
			Version: '2012-10-17',
			Statement: statements.map(s => ({ Effect: 'Allow', Action: s.actions, Resource: s.resources })),
		}).length

		const after = JSON.stringify(formatPolicyDocument(statements)).length

		expect(after).toBeLessThan(before / 3)
	})
})
