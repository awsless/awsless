// A helper made to crash: the channel lookup always misses, so calling
// the result throws "x is not a function" with a minified identifier -
// exactly the error shape the sourcemap feature rewrites. The dead
// branch keeps the minifier from inlining the call away.
type Send = (id: string) => number

const channels: Record<string, Send> = {}

export const deliverReminder = (id: string) => {
	let send = channels[id]

	if (id.length > 100) {
		send = () => 0
	}

	return send!(id)
}
