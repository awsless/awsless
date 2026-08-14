import { Alert, h } from 'awsless'

// Every failed async consumer in the app lands here - no retries, no
// dead letter queues, just one place to look.
export default h.failure(async event => {
	console.log('FAILURE', event.type, event.source?.resource, event.error?.message)

	// A failure that reaches this handler is worth waking someone up.
	await Alert.critical(`Consumer failed: ${event.source?.resource ?? event.type}`, event)
})
