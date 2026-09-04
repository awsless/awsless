import { invoke } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { formatRouteKey, internalInvoke, invokeBundle, isInsideBundle } from './bundle.js'
import { bindGlobalResourceName, isTest } from './util.js'

export const getPubSubPublisherName = bindGlobalResourceName('pubsub-publisher')

export interface PubSubResources {}

export const PubSub: PubSubResources = /*@__PURE__*/ createProxy(name => {
	// The publisher handler is registered under the app level "base" scope.
	const routeKey = formatRouteKey('base', 'pubsub', `${name}-publisher`)

	return {
		publish: async (topic: string, event: string, payload?: unknown) => {
			const message = { topic, event, payload }

			// Tests invoke the per-publisher name, so the name-keyed mocks keep working.
			if (isTest()) {
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
