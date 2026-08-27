import { h } from 'awsless'

// Every error in the app lands here with its stack already mapped to
// the original source. Error level, since the default level is warn.
export default h.error(async event => {
	console.error('ERROR-LOG', event.origin, event.type, event.message)
	console.error(event.stackTrace)
})
