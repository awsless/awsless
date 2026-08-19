import { $ } from '../../src/client/argument'
import { createQuery } from '../../src/client/query'

describe('query', () => {
	it('should generate simple operation', async () => {
		const result = createQuery('query', {
			transaction: {
				id: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'query {transaction{id}}',
			variables: {},
		})
	})

	it('should generate mutation operation', async () => {
		const result = createQuery('mutation', {
			transaction: {
				id: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'mutation {transaction{id}}',
			variables: {},
		})
	})

	it('should handle custom query name', async () => {
		const result = createQuery('query', {
			__name: 'TestQuery',
			transaction: {
				id: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'query TestQuery{transaction{id}}',
			variables: {},
		})
	})

	it('should handle arguments inside the query', async () => {
		const result = createQuery('query', {
			transaction: {
				__args: { id: 1 },
				id: true,
				amount: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'query {transaction(id:1){id,amount}}',
			variables: {},
		})
	})

	it('should handle variable arguments', async () => {
		const result = createQuery('query', {
			transaction: {
				__args: {
					limit: $('Int', 10),
					cursor: $('String', '1'),
				},
				id: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'query ($v1:Int,$v2:String){transaction(limit:$v1,cursor:$v2){id}}',
			variables: {
				v1: 10,
				v2: '1',
			},
		})
	})

	it('should handle undefined argument', async () => {
		const result = createQuery('query', {
			transaction: {
				__args: { limit: undefined },
				id: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'query {transaction{id}}',
			variables: {},
		})
	})

	it('should handle deep arguments', async () => {
		const result = createQuery('query', {
			transaction: {
				__args: {
					deep: {
						limit: 10,
					},
				},
				id: true,
			},
		})

		expect(result).toStrictEqual({
			query: 'query {transaction(deep:{limit:10}){id}}',
			variables: {},
		})
	})

	it('should handle variables with all JSON types', async () => {
		const expectations = [
			{ type: 0, result: `query {a(value:0)}` },
			{ type: 1, result: `query {a(value:1)}` },
			{ type: -1, result: `query {a(value:-1)}` },
			{ type: '1', result: `query {a(value:"1")}` },
			{ type: '"', result: `query {a(value:"\\"")}` },
			{ type: true, result: `query {a(value:true)}` },
			{ type: false, result: `query {a(value:false)}` },
			{ type: [1, 2, 3], result: `query {a(value:[1,2,3])}` },
			{ type: { a: 1, b: 2 }, result: `query {a(value:{a:1,b:2})}` },
			{ type: undefined, result: `query {a}` },
		]

		for (const expectation of expectations) {
			const result = createQuery('query', {
				a: { __args: { value: expectation.type } },
			})

			expect(result).toStrictEqual({
				query: expectation.result,
				variables: {},
			})
		}
	})

	it('should handle deep queries', async () => {
		const result = createQuery('query', {
			transaction: {
				id: true,
				tags: {
					name: true,
				},
			},
		})

		expect(result).toStrictEqual({
			query: 'query {transaction{id,tags{name}}}',
			variables: {},
		})
	})

	it('should handle unions', async () => {
		const result = createQuery('query', {
			product: {
				id: true,
				'...on Book': {
					author: true,
				},
				'...on Car': {
					brand: true,
				},
			},
		})

		expect(result).toStrictEqual({
			query: 'query {product{id,...on Book{author},...on Car{brand}}}',
			variables: {},
		})
	})

	it('should handle aliases', async () => {
		const result = createQuery('query', {
			product: {
				'id:name': true,
				'data:user': {
					name: true,
				},
			},
		})

		expect(result).toStrictEqual({
			query: 'query {product{id:name,data:user{name}}}',
			variables: {},
		})
	})

	it('should handle complex query', async () => {
		const result = createQuery('query', {
			transaction: {
				__args: { id: $('ID!', 1) },
				id: true,
				tags: {
					__args: {
						limit: $('Int', 10),
					},
					name: true,
				},
				'createdAt:date': true,
				'...on Transaction': {
					amount: true,
				},
			},
		})

		expect(result).toStrictEqual({
			query: 'query ($v1:ID!,$v2:Int){transaction(id:$v1){id,tags(limit:$v2){name},createdAt:date,...on Transaction{amount}}}',
			variables: {
				v1: 1,
				v2: 10,
			},
		})
	})
})
