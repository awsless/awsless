import { randomUUID } from 'crypto'
import { createServer, Server } from 'http'
import { DevDispatch, DevReportFailure, DevTrace } from '../../feature.js'
import { parseTraceHeader, readBody, TRACE_HEADER, trackConnections } from '../util.js'

type PublishInput = {
	TopicArn?: string
	Subject?: string
	Message?: string
	MessageAttributes?: Record<string, { DataType?: string; StringValue?: string }>
}

// The sns query protocol encodes message attributes as numbered
// entries: MessageAttributes.entry.1.Name, .1.Value.DataType, ...
const parseQueryPublish = (body: string): PublishInput => {
	const params = new URLSearchParams(body)
	const attributes: NonNullable<PublishInput['MessageAttributes']> = {}

	for (let i = 1; ; i++) {
		const name = params.get(`MessageAttributes.entry.${i}.Name`)

		if (!name) {
			break
		}

		attributes[name] = {
			DataType: params.get(`MessageAttributes.entry.${i}.Value.DataType`) ?? 'String',
			StringValue: params.get(`MessageAttributes.entry.${i}.Value.StringValue`) ?? undefined,
		}
	}

	return {
		TopicArn: params.get('TopicArn') ?? undefined,
		Subject: params.get('Subject') ?? undefined,
		Message: params.get('Message') ?? undefined,
		MessageAttributes: attributes,
	}
}

// A minimal sns emulator that only routes: a published message
// dispatches into the bundle as an sns event, where the bundle's topic
// matcher already fans out to every subscriber route. A publish
// matching a capture is recorded by the owning feature instead (like
// the alert topics) & never reaches the bundle.
export const createSnsServer = (props?: { captures?: ((input: PublishInput) => boolean)[] }) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined
	let reportFailure: DevReportFailure | undefined

	const publish = (input: PublishInput, trace?: DevTrace) => {
		const messageId = randomUUID()

		for (const capture of props?.captures ?? []) {
			if (capture(input)) {
				return messageId
			}
		}
		const attributes: Record<string, { Type: string; Value: string }> = {}

		for (const [name, attribute] of Object.entries(input.MessageAttributes ?? {})) {
			attributes[name] = {
				Type: attribute.DataType ?? 'String',
				Value: attribute.StringValue ?? '',
			}
		}

		const event = {
			Records: [
				{
					EventSource: 'aws:sns',
					EventVersion: '1.0',
					EventSubscriptionArn: `${input.TopicArn}:local`,
					Sns: {
						Type: 'Notification',
						MessageId: messageId,
						TopicArn: input.TopicArn,
						Subject: input.Subject,
						Message: input.Message,
						Timestamp: new Date().toISOString(),
						MessageAttributes: attributes,
					},
				},
			],
		}

		setImmediate(() => {
			dispatch?.(event, trace).catch(error => {
				reportFailure?.({ kind: 'async', event, error })
			})
		})

		return messageId
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
				// A bad body or read error answers 400 instead of throwing
				// out of the handler & killing the dev process.
				const fail = (error: unknown) => {
					if (res.writableEnded || res.destroyed) {
						return
					}

					res.writeHead(400, { 'content-type': 'text/plain' })
					res.end(error instanceof Error ? error.message : String(error))
				}

				void readBody(req)
					.then(raw => {
						const body = raw.toString()
						const target = String(req.headers['x-amz-target'] ?? '')
						const isJson = target.length > 0

						const input = isJson ? (JSON.parse(body || '{}') as PublishInput) : parseQueryPublish(body)
						const action = isJson ? target.split('.').at(-1) : new URLSearchParams(body).get('Action')

						if (action !== 'Publish') {
							res.writeHead(400, { 'content-type': 'text/plain' })
							res.end(`The local dev sns emulator only supports Publish, got: ${action}`)
							return
						}

						const messageId = publish(input, parseTraceHeader(req.headers[TRACE_HEADER]))

						if (isJson) {
							res.writeHead(200, { 'content-type': 'application/x-amz-json-1.0' })
							res.end(JSON.stringify({ MessageId: messageId }))
						} else {
							res.writeHead(200, { 'content-type': 'text/xml' })
							res.end(
								`<?xml version="1.0"?>\n<PublishResponse xmlns="https://sns.amazonaws.com/doc/2010-03-31/"><PublishResult><MessageId>${messageId}</MessageId></PublishResult><ResponseMetadata><RequestId>${randomUUID()}</RequestId></ResponseMetadata></PublishResponse>`
							)
						}
					})
					.catch(fail)
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
