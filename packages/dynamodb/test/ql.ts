
import { generator } from '../src/helper/expression'
import { ql, Table } from '../src/index'

describe('Query Language', () => {

	type Post = {
		id: number
		title: string
	}

	const table = new Table<Post, 'id'>('posts')

	it('should parse sql to expression', () => {
		const gen = generator()
		const result = ql`#id = ${1}, #name = helper(#name, ${2})`

		expect(result(gen, table)).toStrictEqual({
			query: '#n3 = :v1, #n4 = helper(#n4, :v2)',
			names: { '#n3': 'id', '#n4': 'name' },
			values: { ':v1': 1, ':v2': 2 }
		})
	})

	it('should generate unique value keys for a new query', () => {
		const gen = generator()
		const result1 = ql`#other = ${3}`

		expect(result1(gen, table)).toStrictEqual({
			query: '#n2 = :v1',
			names: { '#n2': 'other' },
			values: { ':v1': 3 }
		})

		const result2 = ql`#other = ${3}`

		expect(result2(gen, table)).toStrictEqual({
			query: '#n4 = :v3',
			names: { '#n4': 'other' },
			values: { ':v3': 3 }
		})
	})

	// it('should generate valid expression for setExpression', () => {
	// 	const result = setExpression({
	// 		key: 1
	// 	})

	// 	expect(result(gen, table)).toStrictEqual({
	// 		expression: 'SET #key = :key',
	// 		names: { '#key': 'key' },
	// 		values: { ':key': 1 }
	// 	})
	// })

	// it('should generate valid expression for joinExpression', () => {
	// 	const result = joinExpression(
	// 		setExpression({ key1: 1, key2: 2 }),
	// 		setExpression({ key3: 3 }),
	// 	)

	// 	expect(result(gen, table)).toStrictEqual({
	// 		expression: 'SET #key1 = :key1, #key2 = :key2 SET #key3 = :key3',
	// 		names: { '#key1': 'key1', '#key2': 'key2', '#key3': 'key3' },
	// 		values: { ':key1': 1, ':key2': 2, ':key3': 3 }
	// 	})
	// })
})
