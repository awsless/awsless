import { h } from 'awsless'

export default h.pubsub.auth(async () => {
	return {
		authorized: true,
		allowed: ['*'],
	}
})
