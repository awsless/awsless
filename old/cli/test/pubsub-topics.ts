import { matchTopic, parseTopics } from '../src/feature/pubsub/server/action.js'

describe('pubsub topic matching', () => {
	it('should match exact topics', () => {
		expect(matchTopic(['global'], 'global')).toBe(true)
		expect(matchTopic(['global'], 'other')).toBe(false)
	})

	it('should match a wildcard as exactly one path level', () => {
		expect(matchTopic(['game/*'], 'game/123')).toBe(true)
		expect(matchTopic(['game/*'], 'game/123/round/1')).toBe(false)
		expect(matchTopic(['game/*'], 'game')).toBe(false)
		expect(matchTopic(['game/*'], 'other/123')).toBe(false)
	})

	it('should match wildcards in the middle of a topic', () => {
		expect(matchTopic(['tenant-1/*/high'], 'tenant-1/bet/high')).toBe(true)
		expect(matchTopic(['tenant-1/*/high'], 'tenant-1/bet/low')).toBe(false)
		expect(matchTopic(['tenant-1/*/high'], 'tenant-1/a/b/high')).toBe(false)
	})

	it('should match a lone wildcard as a single level topic only', () => {
		expect(matchTopic(['*'], 'anything')).toBe(true)
		expect(matchTopic(['*'], 'anything/goes')).toBe(false)
	})

	it('should support multiple wildcard segments', () => {
		const guest = ['global', '*/global', '*/bet/all', '*/bet/rare', '*/bet/high', 'game/*', '*/game/*', '*/chat/*']

		expect(matchTopic(guest, 'global')).toBe(true)
		expect(matchTopic(guest, 'tenant-1/global')).toBe(true)
		expect(matchTopic(guest, 'tenant-1/bet/rare')).toBe(true)
		expect(matchTopic(guest, 'game/42')).toBe(true)
		expect(matchTopic(guest, 'tenant-1/game/42')).toBe(true)
		expect(matchTopic(guest, 'tenant-1/chat/lobby')).toBe(true)

		expect(matchTopic(guest, 'tenant-1/bet/low')).toBe(false)
		expect(matchTopic(guest, 'tenant-1/game/42/round/1')).toBe(false)
		expect(matchTopic(guest, 'tenant-1/secret')).toBe(false)
	})

	it('should only treat a full segment as a wildcard', () => {
		expect(matchTopic(['bet-*'], 'bet-rare')).toBe(false)
		expect(matchTopic(['bet-*'], 'bet-*')).toBe(true)
	})
})

describe('pubsub topic parsing', () => {
	const allowed = ['global', 'player/3feb5b8e-f8f5-44b4-97b9-a2e5ec69e74f', 'game/*']

	it('should allow topics with long ids', () => {
		const result = parseTopics(['global', 'player/3feb5b8e-f8f5-44b4-97b9-a2e5ec69e74f'], allowed)

		expect(result.valid).toBe(true)
	})

	it('should allow wildcard matched topics', () => {
		const result = parseTopics(['game/42'], allowed)

		expect(result.valid).toBe(true)
	})

	it('should reject topics that are not allowed', () => {
		const result = parseTopics(['secret'], allowed)

		expect(result.valid).toBe(false)
	})

	it('should reject topics over the max length', () => {
		const topic = `game/${'x'.repeat(130)}`
		const result = parseTopics([topic], allowed)

		expect(result.valid).toBe(false)
	})

	it('should reject empty topic lists & empty topics', () => {
		expect(parseTopics([], allowed).valid).toBe(false)
		expect(parseTopics([''], allowed).valid).toBe(false)
	})

	it('should reject more than 32 topics', () => {
		const topics = Array.from({ length: 33 }, (_, i) => `game/${i}`)

		expect(parseTopics(topics, allowed).valid).toBe(false)
	})
})

describe('pubsub subscription limit', () => {
	const fakeSocket = (subscribed: string[] = []) => {
		const subs = new Set(subscribed)
		const state = { closeReason: undefined as string | undefined }

		const socket = {
			data: {
				id: '3feb5b8e-f8f5-44b4-97b9-a2e5ec69e74f',
				ip: '127.0.0.1',
				authenticated: true,
				allowed: ['game/*'],
			},
			get subscriptions() {
				return [...subs]
			},
			subscribe: (topic: string) => subs.add(topic),
			unsubscribe: (topic: string) => subs.delete(topic),
			isSubscribed: (topic: string) => subs.has(topic),
			sendText: () => {},
			close: (_code?: number, reason?: string) => {
				state.closeReason = reason
			},
		}

		return { socket: socket as never, state, subs }
	}

	it('should allow subscribing up to 32 topics in total', async () => {
		const { subscribe } = await import('../src/feature/pubsub/server/action.js')
		const { socket, state, subs } = fakeSocket(Array.from({ length: 30 }, (_, i) => `game/${i}`))

		subscribe(socket, ['game/30', 'game/31'])

		expect(state.closeReason).toBeUndefined()
		expect(subs.size).toBe(32)
	})

	it('should close the socket when the total subscription limit is exceeded', async () => {
		const { subscribe } = await import('../src/feature/pubsub/server/action.js')
		const { socket, state, subs } = fakeSocket(Array.from({ length: 30 }, (_, i) => `game/${i}`))

		subscribe(socket, ['game/30', 'game/31', 'game/32'])

		expect(state.closeReason).toBe('Too many topic subscriptions')
		expect(subs.size).toBe(30)
	})

	it('should not count already subscribed topics against the limit', async () => {
		const { subscribe } = await import('../src/feature/pubsub/server/action.js')
		const { socket, state, subs } = fakeSocket(Array.from({ length: 32 }, (_, i) => `game/${i}`))

		subscribe(socket, ['game/0', 'game/1'])

		expect(state.closeReason).toBeUndefined()
		expect(subs.size).toBe(32)
	})
})
