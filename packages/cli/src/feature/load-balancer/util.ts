import { createHash } from 'crypto'

// CloudFront adds it to every request it sends the load balancer, whose
// rules only forward requests that carry the right one.
export const ORIGIN_SECRET_HEADER = 'x-origin-secret'

// A listener's rule priorities run from 1 to 50000.
const MAX_PRIORITY = 50_000

// A priority from each rule's key, so adding or removing a rule leaves
// the others alone; a clash moves on to the next free one.
export const assignRulePriorities = (keys: string[]) => {
	const used = new Set<number>()
	const priorities = new Map<string, number>()

	for (const key of keys.toSorted()) {
		let priority = (parseInt(createHash('sha1').update(key).digest('hex').slice(0, 8), 16) % MAX_PRIORITY) + 1

		while (used.has(priority)) {
			priority = (priority % MAX_PRIORITY) + 1
		}

		used.add(priority)
		priorities.set(key, priority)
	}

	return priorities
}

export const formatPubSubRuleKey = (id: string) => `pubsub:${id}`

export const formatRouteRuleKey = (router: string, path: string) => `${router}:${path}`
