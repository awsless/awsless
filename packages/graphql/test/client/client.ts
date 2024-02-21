import { createClient, $ } from '../../src'
import type { Currency, Schema } from '../__types'

describe('client', () => {
	const mock = vi.fn()
	const client = createClient<Schema>(mock)

	it('should call the fetcher', async () => {
		await client.query({
			old: true,
		})

		expect(mock).toBeCalledWith(
			{
				query: 'query {old}',
				variables: {},
			},
			undefined
		)
	})

	it('should mutate log', async () => {
		const result = await client.mutate({
			log: {
				__args: {
					input: {
						messages: ['Hello World'],
					},
				},
			},
		})

		expectTypeOf(result).toEqualTypeOf<{ log: boolean }>()
	})

	it('should query logs', async () => {
		const result = await client.query({
			logs: true,
		})

		expectTypeOf(result).toEqualTypeOf<{
			logs: Array<string | undefined> | undefined
		}>()
	})

	it('should mutate addProduct', async () => {
		const result = await client.mutate({
			addProduct: {
				__args: {
					products: $('[ID!]!', ['1']),
				},
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			addProduct: boolean
		}>()
	})

	it('should query status', async () => {
		const result = await client.query({
			status: true,
		})

		expectTypeOf(result).toEqualTypeOf<{
			status: boolean | undefined
		}>()
	})

	it('should mutate transact', async () => {
		const result = await client.mutate({
			transact: {
				__args: {
					amount: 1,
					currency: 'EUR',
				},
				id: true,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			transact: {
				id: string
			}
		}>()
	})

	it('should query deprecated', async () => {
		const args = {
			email: 'admin',
			password: 'admin',
		} as const

		const result = await client.mutate({
			login: {
				__args: args,
				idToken: true,
				accessToken: true,
				refreshToken: true,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			login: {
				idToken: string
				accessToken: string
				refreshToken: string
			}
		}>()
	})

	it('should query rates', async () => {
		const result = await client.query({
			rates: {
				amount: true,
				updatedAt: true,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			rates: {
				amount: number
				updatedAt: string | undefined
			}[]
		}>()
	})

	it('should query transactions', async () => {
		const result = await client.query({
			transactions: {
				id: true,
				currency: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			transactions: {
				id: string
				currency: 'EUR' | 'USD'
				createdAt: string
				updatedAt: string | undefined
			}[]
		}>()
	})

	it('should query paginated transactions', async () => {
		const result = await client.query({
			transactions: {
				__args: { limit: $('Int', 10) },
				id: true,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			transactions: {
				id: string
			}[]
		}>()
	})

	it('should query union transactions', async () => {
		const result = await client.query({
			transactions: {
				__typename: true,
				id: true,
				'...on Deposit': {
					from: true,
				},
				'...on Withdraw': {
					to: true,
				},
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			transactions: (
				| {
						__typename: 'Deposit'
						id: string
						from: string
				  }
				| {
						__typename: 'Withdraw'
						id: string
						to: string
				  }
			)[]
		}>()
	})

	it('should query games', async () => {
		const result = await client.query({
			games: {
				__typename: true,
				'...on Dice': {
					number: true,
				},
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			games: (
				| {
						__typename: 'Dice'
						number: number
				  }
				| {
						__typename: 'Keno'
				  }
			)[]
		}>()
	})

	it('should query aliases', async () => {
		const result = await client.query({
			'one:rates': {
				amount: true,
			},
			'two:rates': {
				amount: true,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			one: { amount: number }[]
			two: { amount: number }[]
		}>()
	})

	it('should query aliases inside a union', async () => {
		const result = await client.query({
			'list:games': {
				'type:__typename': true,
				'...on Dice': {
					'amount:number': true,
				},
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			list: (
				| {
						type: 'Dice'
						amount: number
				  }
				| {
						type: 'Keno'
				  }
			)[]
		}>()
	})

	it('should query fragments', async () => {
		const rateFragment = {
			amount: true,
			currency: true,
		} as const

		const result = await client.query({
			rates: {
				...rateFragment,
			},
			'more:rates': {
				...rateFragment,
			},
		})

		expectTypeOf(result).toEqualTypeOf<{
			rates: {
				amount: number
				currency: Currency
			}[]
			more: {
				amount: number
				currency: Currency
			}[]
		}>()
	})

	it('should query complex fragments', async () => {
		const fragment = () =>
			({
				__args: { cursor: '1', limit: 10 },
				id: true,
			} as const)

		const result = await client.query({
			't1:transactions': fragment(),
			't2:transactions': fragment(),
			't3:transactions': fragment(),
		})

		expectTypeOf(result).toEqualTypeOf<{
			t1: { id: string }[]
			t2: { id: string }[]
			t3: { id: string }[]
		}>()
	})

	// it('should create query', async () => {
	// 	const query = createQuery('query', {
	// 		status: true,
	// 	})

	// 	const result = await client.call(query)

	// 	expect(result).toBe('query {status}')

	// 	expectTypeOf(result).toEqualTypeOf<{
	// 		status: boolean | undefined
	// 	}>()
	// })
})
