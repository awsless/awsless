import { getQueueName, getQueueUrl } from '../../old/node/queue.js'

describe('Queue', () => {
	it('url', () => {
		const url = getQueueUrl('queue', 'stack')
		const name = getQueueName('queue', 'stack')
		console.log(url, name)
	})
})
