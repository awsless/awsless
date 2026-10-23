import { h } from 'awsless'

type Event = {
	viewer?: { ip?: string; userAgent?: string; country?: { code?: string } }
}

// The rpc handle merges the viewer into the payload, so this echoes
// back exactly the ip a real rpc function would see.
export default h.func(async (event: Event) => {
	return {
		ip: event.viewer?.ip,
		userAgent: event.viewer?.userAgent,
		country: event.viewer?.country?.code,
	}
})
