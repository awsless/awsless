import { createHash, randomUUID } from 'crypto'
import { createServer, Server } from 'http'
import { DevDispatch, DevReportFailure, DevTrace } from '../../feature.js'
import { parseTraceHeader, readBody, TRACE_HEADER, trackConnections } from '../util.js'

type MessageAttributes = Record<string, { DataType?: string; StringValue?: string; BinaryValue?: string }>

type SendMessageInput = {
	QueueUrl?: string
	MessageBody?: string
	DelaySeconds?: number
	MessageAttributes?: MessageAttributes
}

const md5 = (value: string | Buffer) => createHash('md5').update(value).digest('hex')

// The md5 of message attributes follows the sqs checksum spec: sorted
// attribute names, with every part prefixed by its 4 byte big endian
// length, and a single transport byte per value (1 = string, 2 = binary).
const md5OfAttributes = (attributes: MessageAttributes) => {
	const parts: Buffer[] = []

	const push = (value: string) => {
		const data = Buffer.from(value, 'utf8')
		const size = Buffer.alloc(4)

		size.writeUInt32BE(data.length)
		parts.push(size, data)
	}

	for (const name of Object.keys(attributes).sort()) {
		const attribute = attributes[name]!

		push(name)
		push(attribute.DataType ?? 'String')

		if (typeof attribute.BinaryValue === 'string') {
			const data = Buffer.from(attribute.BinaryValue, 'base64')
			const size = Buffer.alloc(4)

			size.writeUInt32BE(data.length)
			parts.push(Buffer.from([2]), size, data)
		} else {
			const data = Buffer.from(attribute.StringValue ?? '', 'utf8')
			const size = Buffer.alloc(4)

			size.writeUInt32BE(data.length)
			parts.push(Buffer.from([1]), size, data)
		}
	}

	return md5(Buffer.concat(parts))
}

const formatEventAttributes = (attributes: MessageAttributes) => {
	const list: Record<string, { dataType: string; stringValue?: string; binaryValue?: string }> = {}

	for (const [name, attribute] of Object.entries(attributes)) {
		list[name] = {
			dataType: attribute.DataType ?? 'String',
			stringValue: attribute.StringValue,
			binaryValue: attribute.BinaryValue,
		}
	}

	return list
}

// A message stored for a pull based queue, waiting for a consumer to
// receive it.
type PullMessage = {
	id: string
	body: string
	attributes: MessageAttributes
	sentAt: number
	firstReceivedAt?: number
	receiveCount: number
	// The moment the message becomes receivable (again): a delayed send
	// or an in-flight visibility timeout push it into the future.
	visibleAt: number
	receipt?: string
}

// A minimal sqs emulator with two queue shapes: a queue with a consumer
// route dispatches every sent message straight into the bundle as an
// sqs event, while a pull queue (like an instance polling its own
// queue) stores messages for ReceiveMessage long polling instead. No
// retries or dlq locally - a failing consumer reports to the app's
// on-failure consumer instead.
export const createSqsServer = (props: {
	region: string
	accountId: string
	// The physical queue name mapped to its consumer route key. A queue
	// without a route key is pull based.
	queues: Map<string, string | undefined>
}) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined
	let reportFailure: DevReportFailure | undefined
	let boundPort = 0

	// The stored messages of the pull queues, kept outside the queues
	// map so a dev restart re-registering the queues keeps the backlog.
	const stores = new Map<string, PullMessage[]>()

	// The pending DelaySeconds timers of push queues.
	const delayed = new Set<ReturnType<typeof setTimeout>>()

	const queueFromUrl = (url: string | undefined) => {
		const name = url?.split('/').filter(Boolean).at(-1)

		return name && props.queues.has(name) ? name : undefined
	}

	const storeOf = (queue: string) => {
		if (!stores.has(queue)) {
			stores.set(queue, [])
		}

		return stores.get(queue)!
	}

	const deliver = (queue: string, input: SendMessageInput, messageId: string, trace?: DevTrace) => {
		const now = Date.now()

		// A pull queue stores the message until a consumer receives it,
		// instead of dispatching into the bundle.
		if (props.queues.get(queue) === undefined) {
			storeOf(queue).push({
				id: messageId,
				body: input.MessageBody ?? '',
				attributes: input.MessageAttributes ?? {},
				sentAt: now,
				receiveCount: 0,
				visibleAt: now + (input.DelaySeconds ?? 0) * 1000,
			})

			return
		}

		const event = {
			Records: [
				{
					messageId,
					receiptHandle: randomUUID(),
					body: input.MessageBody,
					attributes: {
						ApproximateReceiveCount: '1',
						SentTimestamp: String(now),
						SenderId: 'local',
						ApproximateFirstReceiveTimestamp: String(now),
					},
					messageAttributes: formatEventAttributes(input.MessageAttributes ?? {}),
					md5OfBody: md5(input.MessageBody ?? ''),
					eventSource: 'aws:sqs',
					eventSourceARN: `arn:aws:sqs:${props.region}:${props.accountId}:${queue}`,
					awsRegion: props.region,
				},
			],
		}

		const send = () => {
			dispatch?.(event, trace).catch(error => {
				let body: unknown = input.MessageBody

				try {
					body = JSON.parse(input.MessageBody ?? '')
				} catch (_) {}

				reportFailure?.({
					kind: 'queue',
					routeKey: props.queues.get(queue),
					event: body,
					error,
					queue: { name: queue },
				})
			})
		}

		if (input.DelaySeconds) {
			// Tracked so stop() can clear them: a delay goes up to 900s &
			// must never dispatch into a torn down environment.
			const timer = setTimeout(() => {
				delayed.delete(timer)
				send()
			}, input.DelaySeconds * 1000)

			delayed.add(timer)
		} else {
			setImmediate(send)
		}
	}

	const sendResult = (input: SendMessageInput, messageId: string) => {
		return {
			MessageId: messageId,
			MD5OfMessageBody: md5(input.MessageBody ?? ''),
			...(input.MessageAttributes && Object.keys(input.MessageAttributes).length > 0
				? { MD5OfMessageAttributes: md5OfAttributes(input.MessageAttributes) }
				: {}),
		}
	}

	// The sdk uses the queue url as the request endpoint, so the url must
	// carry the real bound address instead of a placeholder host.
	const queueUrl = (name: string) => {
		return `http://127.0.0.1:${boundPort}/${props.accountId}/${name}`
	}

	const findByReceipt = (queue: string, receipt: string | undefined) => {
		return storeOf(queue).find(message => message.receipt === receipt)
	}

	const actions: Record<string, (input: any, signal: AbortSignal, trace?: DevTrace) => unknown> = {
		GetQueueUrl(input: { QueueName?: string }) {
			if (!input.QueueName || !props.queues.has(input.QueueName)) {
				throw new Error(`Unknown local queue: ${input.QueueName}`)
			}

			return {
				QueueUrl: queueUrl(input.QueueName),
			}
		},
		SendMessage(input: SendMessageInput, _signal: AbortSignal, trace?: DevTrace) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const messageId = randomUUID()

			deliver(queue, input, messageId, trace)

			return sendResult(input, messageId)
		},
		SendMessageBatch(
			input: { QueueUrl?: string; Entries?: Array<SendMessageInput & { Id?: string }> },
			_signal: AbortSignal,
			trace?: DevTrace
		) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			return {
				Successful: (input.Entries ?? []).map(entry => {
					const messageId = randomUUID()

					deliver(queue, entry, messageId, trace)

					return {
						Id: entry.Id,
						...sendResult(entry, messageId),
					}
				}),
				Failed: [],
			}
		},
		async ReceiveMessage(
			input: {
				QueueUrl?: string
				MaxNumberOfMessages?: number
				WaitTimeSeconds?: number
				VisibilityTimeout?: number
			},
			signal: AbortSignal
		) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const store = storeOf(queue)
			const deadline = Date.now() + (input.WaitTimeSeconds ?? 0) * 1000

			// Long polling as a plain wait loop: cheap locally & a closed
			// connection (like a consumer shutting down) stops the wait.
			while (true) {
				const now = Date.now()
				const visible = store.filter(message => message.visibleAt <= now)

				if (visible.length > 0) {
					const batch = visible.slice(0, Math.max(1, input.MaxNumberOfMessages ?? 1))

					return {
						Messages: batch.map(message => {
							message.receipt = randomUUID()
							message.receiveCount += 1
							message.firstReceivedAt ??= now
							message.visibleAt = now + (input.VisibilityTimeout ?? 30) * 1000

							return {
								MessageId: message.id,
								ReceiptHandle: message.receipt,
								Body: message.body,
								MD5OfBody: md5(message.body),
								Attributes: {
									ApproximateReceiveCount: String(message.receiveCount),
									SentTimestamp: String(message.sentAt),
									SenderId: 'local',
									ApproximateFirstReceiveTimestamp: String(message.firstReceivedAt),
								},
								...(Object.keys(message.attributes).length > 0
									? {
											MessageAttributes: message.attributes,
											MD5OfMessageAttributes: md5OfAttributes(message.attributes),
										}
									: {}),
							}
						}),
					}
				}

				if (now >= deadline || signal.aborted) {
					return {}
				}

				await new Promise(resolve => setTimeout(resolve, 100))
			}
		},
		DeleteMessage(input: { QueueUrl?: string; ReceiptHandle?: string }) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const store = storeOf(queue)
			const index = store.findIndex(message => message.receipt === input.ReceiptHandle)

			if (index >= 0) {
				store.splice(index, 1)
			}

			return {}
		},
		DeleteMessageBatch(input: { QueueUrl?: string; Entries?: Array<{ Id?: string; ReceiptHandle?: string }> }) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const store = storeOf(queue)

			return {
				Successful: (input.Entries ?? []).map(entry => {
					const index = store.findIndex(message => message.receipt === entry.ReceiptHandle)

					if (index >= 0) {
						store.splice(index, 1)
					}

					return { Id: entry.Id }
				}),
				Failed: [],
			}
		},
		ChangeMessageVisibility(input: { QueueUrl?: string; ReceiptHandle?: string; VisibilityTimeout?: number }) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const message = findByReceipt(queue, input.ReceiptHandle)

			if (message) {
				message.visibleAt = Date.now() + (input.VisibilityTimeout ?? 0) * 1000
			}

			return {}
		},
		GetQueueAttributes(input: { QueueUrl?: string }) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const now = Date.now()
			const store = storeOf(queue)

			return {
				Attributes: {
					QueueArn: `arn:aws:sqs:${props.region}:${props.accountId}:${queue}`,
					ApproximateNumberOfMessages: String(store.filter(m => m.visibleAt <= now).length),
					ApproximateNumberOfMessagesNotVisible: String(store.filter(m => m.visibleAt > now).length),
				},
			}
		},
		PurgeQueue(input: { QueueUrl?: string }) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			storeOf(queue).length = 0

			return {}
		},
	}

	return {
		connect(dispatchFn: DevDispatch, reportFailureFn?: DevReportFailure) {
			dispatch = dispatchFn
			reportFailure = reportFailureFn
		},
		// Binds immediately on a free port & returns the actual port, so
		// a stale reserved port can never end up in the environment.
		async listen(port = 0) {
			server = createServer((req, res) => {
				void readBody(req)
					.then(async body => {
						const target = String(req.headers['x-amz-target'] ?? '')
						const action = actions[target.split('.').at(-1) ?? '']

						// A consumer closing its connection (like an aborted long
						// poll during shutdown) stops the wait loop.
						const abort = new AbortController()
						res.on('close', () => abort.abort())

						try {
							if (!action) {
								throw new Error(`The local dev sqs emulator does not support: ${target}`)
							}

							const result = await action(
								JSON.parse(body.toString() || '{}'),
								abort.signal,
								parseTraceHeader(req.headers[TRACE_HEADER])
							)

							if (res.writableEnded || res.destroyed) {
								return
							}

							res.writeHead(200, { 'content-type': 'application/x-amz-json-1.0' })
							res.end(JSON.stringify(result))
						} catch (error) {
							if (res.writableEnded || res.destroyed) {
								return
							}

							res.writeHead(400, { 'content-type': 'application/x-amz-json-1.0' })
							res.end(
								JSON.stringify({
									__type: 'InvalidAction',
									message: error instanceof Error ? error.message : String(error),
								})
							)
						}
					})
					.catch(() => {
						if (!res.writableEnded && !res.destroyed) {
							res.writeHead(400, { 'content-type': 'application/x-amz-json-1.0' })
							res.end(
								JSON.stringify({ __type: 'InvalidAction', message: 'Failed to read the request body.' })
							)
						}
					})
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})

			boundPort = (server.address() as { port: number }).port

			return boundPort
		},
		stop() {
			for (const timer of delayed) {
				clearTimeout(timer)
			}

			delayed.clear()

			return closeServer?.() ?? Promise.resolve()
		},
	}
}
