import { stringify } from '@awsless/json'
import { lambda } from '@awsless/lambda'
import { maxLength, minLength, object, optional, pipe, string, unknown } from '@awsless/validate'
import { getRouteEnv } from 'awsless'
import { Redis } from 'ioredis'

// One connection per container, reused across invocations. A connection
// per publish makes every publish pay a fresh TCP handshake, and a
// burst of publishes on a loaded machine then floods the accept queue &
// times the handshakes out, dropping the events.
let client: Redis | undefined

const getClient = () => {
	// A client that exhausted its reconnect attempts is finished for
	// good, so replace it - one bad spell must not blackhole every
	// publish after it.
	if (!client || client.status === 'end') {
		client = new Redis({
			host: getRouteEnv('REDIS_HOST')!,
			port: Number(getRouteEnv('REDIS_PORT') ?? 6379),
			// The local dev environment runs a plain redis without tls.
			tls: getRouteEnv('REDIS_TLS') === 'disabled' ? undefined : {},
			lazyConnect: true,
			keepAlive: 0,
			noDelay: true,
			enableReadyCheck: false,
			// Ride out short outages & load bursts instead of failing the
			// publish: reconnect on a capped backoff & retry the command
			// across reconnects, giving up only after ~20s.
			maxRetriesPerRequest: 10,
			retryStrategy: times => (times > 20 ? null : Math.min(times * 250, 2000)),
			connectTimeout: 10_000,
			commandTimeout: 10_000,
		})

		// Failed attempts already feed the retry strategy - without a
		// listener each one also logs an unhandled error event.
		client.on('error', () => {})
	}

	return client
}

export default lambda({
	schema: object({
		topic: pipe(string(), minLength(1), maxLength(128)),
		event: pipe(string(), minLength(1), maxLength(64)),
		payload: optional(unknown()),
	}),
	async handle({ topic, event, payload }) {
		await getClient().publish(
			getRouteEnv('CHANNEL')!,
			stringify({
				topic,
				event,
				payload: typeof payload === 'undefined' ? undefined : stringify(payload),
			})
		)
	},
})
