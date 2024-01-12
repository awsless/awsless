import { Client, MemoryStore, NewPasswordRequired, changePassword, newPassword, signIn } from '../src'

describe('login', () => {
	const client = new Client({
		id: '6cu26om5k20ghumnccc4u57dcg',
		secret: 'g1iopppm9fcd7h22dbeho1k57p24ilrs8asvkf13a53kttpfj3n',
		userPoolId: 'eu-west-1_t9BCyW5ei',
		store: new MemoryStore(),
	})

	it('http', async () => {
		const session = await signIn(client, {
			username: 'test',
			password: 'Test123!',
		})

		// const session = await signIn(client, {
		// 	username: 'info@jacksclub.io',
		// 	password: 'Test123!',
		// })

		const endpoint = 'https://http.crypto-trender.com/'
		const response = await fetch(endpoint, {
			method: 'GET',
			headers: {
				Authorization: session.accessToken.toString(),
			},
		})

		console.log('------------------------------')
		console.log(response.ok)
		console.log(response.status)
		console.log(response.statusText)
		console.log('------------------------------')

		const result = await response.text()

		console.log(result)
		console.log('------------------------------')
	})

	// it('graphql', async () => {
	// 	// const session = await signIn(client, {
	// 	// 	username: 'test',
	// 	// 	password: 'Test123!',
	// 	// })

	// 	const session = await signIn(client, {
	// 		username: 'info@jacksclub.io',
	// 		password: 'Test123!',
	// 	})

	// 	// await changePassword(client, {
	// 	// 	previousPassword: 'Test1234!',
	// 	// 	proposedPassword: 'Test123!',
	// 	// })

	// 	// const endpoint = 'https://pin5pl7eqrdhrpqxqk5ullrmem.appsync-api.eu-west-1.amazonaws.com/graphql'
	// 	const endpoint = 'https://graphql.crypto-trender.com/graphql'
	// 	const query = 'query Test { one }'
	// 	const variables = {}
	// 	const response = await fetch(endpoint, {
	// 		method: 'POST',
	// 		body: JSON.stringify({ query, variables }),
	// 		headers: {
	// 			Origin: 'https://graphql.crypto-trender.com',
	// 			Authorization: session.accessToken.toString(),
	// 		},
	// 	})

	// 	console.log('------------------------------')
	// 	console.log(response.ok)
	// 	console.log(response.status)
	// 	console.log(response.statusText)
	// 	console.log('------------------------------')

	// 	const result = await response.json()

	// 	// console.log(result)

	// 	console.log(JSON.parse(result.data.one))
	// 	console.log('------------------------------')
	// })

	// it('', async () => {
	// 	try {
	// 		const session = await signIn(client, {
	// 			username: 'test',
	// 			password: 'Test123!',
	// 		})

	// 		console.log(session.idToken.payload)
	// 	} catch (error) {
	// 		if (error instanceof NewPasswordRequired) {
	// 			await newPassword(client, error, {
	// 				password: 'Test1234!',
	// 			})
	// 		}

	// 		console.log(error)
	// 	}
	// })
})
