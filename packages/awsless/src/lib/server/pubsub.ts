import { invoke } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { formatRouteKey, internalInvoke, invokeBundle, isInsideBundle } from './bundle.js'
import { bindGlobalResourceName, IS_TEST } from './util.js'

export const getPubSubPublisherName = bindGlobalResourceName('pubsub-publisher')

export interface PubSubResources {}

export const PubSub: PubSubResources = /*@__PURE__*/ createProxy(name => {
	// The publisher handler is registered under the app level "base" scope.
	const routeKey = formatRouteKey('base', 'pubsub', `${name}-publisher`)

	return {
		publish: async (topic: string, event: string, payload?: unknown) => {
			const message = { topic, event, payload }

			// In tests we keep invoking the per-publisher name
			// so that the pubsub mocks keep working.
			if (IS_TEST) {
				await invoke({
					name: getPubSubPublisherName(name),
					type: 'Event',
					payload: message,
				})
				return
			}

			// Inside the bundle we dispatch in-process instead of self-invoking.
			if (isInsideBundle()) {
				await internalInvoke(routeKey, message)
				return
			}

			await invokeBundle({
				routeKey,
				payload: message,
				type: 'Event',
			})
		},
	}
})
