import { hours } from '@awsless/duration'
import { Config, h } from 'awsless'

export default h.rpc.auth(async event => {
	if (event.token !== Config.adminSecret) {
		return { authorized: false }
	}

	return {
		authorized: true,
		ttl: hours(1),
		lockKey: event.token,
		context: { role: 'admin' },
	}
})
