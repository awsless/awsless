import { array, custom, maxLength, minLength, pipe, safeParse, string } from '@awsless/validate'
import { publishEvent } from './event'
import { Socket } from './type'

const MAX_TOPICS = 32
const MAX_TOPIC_LENGTH = 128

// Allowed topics can contain a `*` wildcard segment that
// matches exactly one path level with any value.
// For example `game/*` allows `game/123`, but not `game/123/round`.
export const matchTopic = (allowedTopics: string[], topic: string) => {
	const segments = topic.split('/')

	return allowedTopics.some(allowed => {
		const pattern = allowed.split('/')

		if (pattern.length !== segments.length) {
			return false
		}

		return pattern.every((segment, i) => {
			return segment === '*' || segment === segments[i]
		})
	})
}

export const parseTopics = (
	value: unknown,
	allowedTopics: string[]
):
	| {
			valid: true
			topics: string[]
	  }
	| {
			valid: false
			reason: string
	  } => {
	const result = safeParse(
		pipe(
			array(
				pipe(
					string(),
					minLength(1),
					maxLength(MAX_TOPIC_LENGTH),
					custom(topic => {
						return typeof topic === 'string' && matchTopic(allowedTopics, topic)
					})
				)
			),
			minLength(1),
			maxLength(MAX_TOPICS)
		),
		value
	)

	if (result.success) {
		return {
			valid: true,
			topics: result.output,
		}
	}

	return {
		valid: false,
		reason: result.issues[0].message,
	}
}

export const connect = (socket: Socket) => {
	publishEvent('connected', {
		socketId: socket.data.id,
		ip: socket.data.ip,
		context: socket.data.context,
	})
}

export const disconnect = (socket: Socket) => {
	unsubscribeAll(socket)
	socket.close()

	// Sockets that never passed authentication
	// were never "connected" to begin with.
	if (socket.data.authenticated) {
		publishEvent('disconnected', {
			socketId: socket.data.id,
			ip: socket.data.ip,
			context: socket.data.context,
		})
	}
}

export const subscribe = (socket: Socket, payload: unknown) => {
	const result = parseTopics(payload, socket.data.allowed)

	if (!result.valid) {
		socket.close(4000, 'Invalid topic payload')
		return
	}

	// Only count topics the socket isn't already subscribed to.
	const topics = [...new Set(result.topics)].filter(topic => {
		return !socket.isSubscribed(topic)
	})

	if (socket.subscriptions.length + topics.length > MAX_TOPICS) {
		socket.close(4000, 'Too many topic subscriptions')
		return
	}

	for (const topic of topics) {
		socket.subscribe(topic)
	}

	if (topics.length > 0) {
		publishEvent('subscribed', {
			socketId: socket.data.id,
			ip: socket.data.ip,
			context: socket.data.context,
			topics,
		})
	}

	socket.sendText(`ACK`)
}

export const unsubscribe = (socket: Socket, payload: unknown) => {
	const result = parseTopics(payload, socket.data.allowed)

	if (!result.valid) {
		socket.close(4000, 'Invalid topic payload')
		return
	}

	const topics = result.topics.filter(topic => {
		return socket.isSubscribed(topic)
	})

	for (const topic of topics) {
		socket.unsubscribe(topic)
	}

	if (topics.length > 0) {
		publishEvent('unsubscribed', {
			socketId: socket.data.id,
			ip: socket.data.ip,
			context: socket.data.context,
			topics,
		})
	}

	socket.sendText(`ACK`)
}

export const unsubscribeAll = (socket: Socket) => {
	const topics = socket.subscriptions

	for (const topic of topics) {
		socket.unsubscribe(topic)
	}

	if (topics.length > 0) {
		publishEvent('unsubscribed', {
			socketId: socket.data.id,
			ip: socket.data.ip,
			context: socket.data.context,
			topics,
		})
	}
}
