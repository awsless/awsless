import { array, custom, maxLength, minLength, pipe, safeParse, string } from '@awsless/validate'
import { publishEvent } from './event'
import { Socket } from './type'

const MAX_TOPICS = 25
const MAX_TOPIC_LENGTH = 25

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
					maxLength(MAX_TOPIC_LENGTH),
					custom(topic => {
						return typeof topic === 'string' && allowedTopics.includes(topic)
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
		context: socket.data.context,
	})
}

export const disconnect = (socket: Socket) => {
	unsubscribeAll(socket)
	socket.close()
	publishEvent('disconnected', {
		context: socket.data.context,
	})
}

export const subscribe = (socket: Socket, payload: unknown) => {
	const result = parseTopics(payload, socket.data.allowed)

	if (!result.valid) {
		unsubscribeAll(socket)
		socket.close(4000, 'Invalid topic payload')
		return
	}

	for (const topic of result.topics) {
		socket.subscribe(topic)
	}

	if (result.topics.length > 0) {
		socket.sendText(`ACK`)

		publishEvent('subscribe', {
			context: socket.data.context,
			topics: result.topics,
		})
	}
}

export const unsubscribe = (socket: Socket, payload: unknown) => {
	const result = parseTopics(payload, socket.data.allowed)

	if (!result.valid) {
		unsubscribeAll(socket)
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
		socket.sendText(`ACK`)

		publishEvent('unsubscribe', {
			context: socket.data.context,
			topics,
		})
	}
}

export const unsubscribeAll = (socket: Socket) => {
	const topics = socket.subscriptions

	for (const topic of topics) {
		socket.unsubscribe(topic)
	}

	if (topics.length > 0) {
		publishEvent('unsubscribe', {
			context: socket.data.context,
			topics,
		})
	}
}
