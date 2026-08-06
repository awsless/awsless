import { h } from 'awsless'

export default h.pubsub.connected(async event => {
	console.log('SOCKET CONNECTED', event.socketId, 'from', event.ip)
})
