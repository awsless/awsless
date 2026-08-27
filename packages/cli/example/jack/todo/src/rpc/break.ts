import { h, v } from 'awsless'
import { deliverReminder } from '../lib/deliver'

// A function made to crash, proving the sourcemap feature: the helper
// throws "x is not a function" naming a minified identifier, which the
// on-error-log consumer receives mapped back to the original source.
export default h.func(v.object({}), async () => {
	return deliverReminder('rpc-crash')
})
