import { createHash, randomUUID } from 'crypto'
import { createServer, Server } from 'http'
import { DevDispatch, DevReportFailure } from '../../feature.js'
import { trackConnections } from '../util.js'

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

// A minimal sqs emulator that only routes: a sent message immediately
// dispatches into the bundle as an sqs event for the queue's consumer
// route. No retries or dlq locally - a failing consumer reports to the
// app's on-failure consumer instead.
export const createSqsServer = (props: {
	region: string
	accountId: string
	// The physical queue name mapped to its consumer route key.
	queues: Map<string, string>
}) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined
	let reportFailure: DevReportFailure | undefined

	const queueFromUrl = (url: string | undefined) => {
		const name = url?.split('/').filter(Boolean).at(-1)

		return name && props.queues.has(name) ? name : undefined
	}

	const deliver = (queue: string, input: SendMessageInput, messageId: string) => {
		const now = Date.now()
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
			dispatch?.(event).catch(error => {
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
			setTimeout(send, input.DelaySeconds * 1000)
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

	const actions: Record<string, (input: any) => unknown> = {
		GetQueueUrl(input: { QueueName?: string }) {
			return {
				QueueUrl: `http://sqs.local/${props.accountId}/${input.QueueName}`,
			}
		},
		SendMessage(input: SendMessageInput) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			const messageId = randomUUID()

			deliver(queue, input, messageId)

			return sendResult(input, messageId)
		},
		SendMessageBatch(input: { QueueUrl?: string; Entries?: Array<SendMessageInput & { Id?: string }> }) {
			const queue = queueFromUrl(input.QueueUrl)

			if (!queue) {
				throw new Error(`Unknown local queue: ${input.QueueUrl}`)
			}

			return {
				Successful: (input.Entries ?? []).map(entry => {
					const messageId = randomUUID()

					deliver(queue, entry, messageId)

					return {
						Id: entry.Id,
						...sendResult(entry, messageId),
					}
				}),
				Failed: [],
			}
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
				const chunks: Buffer[] = []
				req.on('data', chunk => chunks.push(chunk))
				req.on('end', () => {
					const target = String(req.headers['x-amz-target'] ?? '')
					const action = actions[target.split('.').at(-1) ?? '']

					try {
						if (!action) {
							throw new Error(`The local dev sqs emulator does not support: ${target}`)
						}

						const result = action(JSON.parse(Buffer.concat(chunks).toString() || '{}'))

						res.writeHead(200, { 'content-type': 'application/x-amz-json-1.0' })
						res.end(JSON.stringify(result))
					} catch (error) {
						res.writeHead(400, { 'content-type': 'application/x-amz-json-1.0' })
						res.end(
							JSON.stringify({
								__type: 'InvalidAction',
								message: error instanceof Error ? error.message : String(error),
							})
						)
					}
				})
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})

			return (server!.address() as { port: number }).port
		},
		stop() {
			return closeServer?.() ?? Promise.resolve()
		},
	}
}
