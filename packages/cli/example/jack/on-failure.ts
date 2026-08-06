import { h } from 'awsless'

// Every failed async consumer in the app lands here - no retries, no
// dead letter queues, just one place to look.
export default h.failure(async event => {
	console.log('FAILURE', event.type, event.source?.resource, event.error?.message)
})
