import { h } from 'awsless'

// Every error logged by any lambda in the app lands here, with its
// stack trace already mapped back to the original source through the
// uploaded sourcemaps. The console output goes to this handler's own
// log group, which is never subscribed - so logging the error again is
// loop-safe & the easiest place to see the symbolicated result. It
// logs at error level, since the handler's application log level
// defaults to warn & would swallow console.log lines.
export default h.error(async event => {
	console.error('ERROR-LOG', event.origin, event.type, event.message)
	console.error(event.stackTrace)
})
