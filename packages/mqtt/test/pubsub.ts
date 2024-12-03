import { createClient } from '../src'

describe(
	'PubSub',
	() => {
		it('jacksclub', async () => {
			const endpoint = 'an4n95zo1nz5u-ats.iot.eu-west-1.amazonaws.com'
			const authorizer = 'jacksclub--pubsub--casino'

			const client = createClient({
				endpoint: `wss://${endpoint}/mqtt`,
				username: `?x-amz-customauthorizer-name=${authorizer}`,
				password: 'lol',
			})

			console.log('sub')

			await client.subscribe('player', event => {
				console.log(event)
			})

			console.log('subbed')
		})
	},
	1000 * 60
)

// const mqtt = createClient(async () => {
// 	const config = typeof props === 'function' ? await props() : props

// 	return {
// 		endpoint: `wss://${config.endpoint}/mqtt`,
// 		username: `?x-amz-customauthorizer-name=${config.authorizer}`,
// 		password: config.token,
// 	}
// })
