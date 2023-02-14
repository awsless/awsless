
import { mockDynamoDB } from '@heat/aws-test'
import { describe, it, expect } from 'vitest'
import { ql, joinExpression, setExpression } from '../src/index'

describe('Query Language', () => {

	mockDynamoDB({
		path: './test/aws/dynamodb.yml'
	})

	it('should parse sql to expression', () => {
		const result = ql`#id = ${1}, #name = helper(#name, ${2})`

		expect(result).toStrictEqual({
			expression: '#id = :v1, #name = helper(#name, :v2)',
			names: { '#id': 'id', '#name': 'name' },
			values: { ':v1': 1, ':v2': 2 }
		})
	})

	it('should generate unique value keys for a new query', () => {
		const result = ql`#other = ${3}`

		expect(result).toStrictEqual({
			expression: '#other = :v3',
			names: { '#other': 'other' },
			values: { ':v3': 3 }
		})
	})

	it('should generate valid expression for setExpression', () => {
		const result = setExpression({
			key: 1
		})

		expect(result).toStrictEqual({
			expression: 'SET #key = :key',
			names: { '#key': 'key' },
			values: { ':key': 1 }
		})
	})

	it('should generate valid expression for joinExpression', () => {
		const result = joinExpression(
			setExpression({ key1: 1, key2: 2 }),
			setExpression({ key3: 3 }),
		)

		expect(result).toStrictEqual({
			expression: 'SET #key1 = :key1, #key2 = :key2 SET #key3 = :key3',
			names: { '#key1': 'key1', '#key2': 'key2', '#key3': 'key3' },
			values: { ':key1': 1, ':key2': 2, ':key3': 3 }
		})
	})
})
