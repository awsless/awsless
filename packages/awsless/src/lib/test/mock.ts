import type { Mock } from 'vitest'
import { createProxy } from '../proxy.js'
import { getAlertName } from '../server/alert.js'
import { getConfigValue, setConfigValue } from '../server/config.js'
import { getFunctionName } from '../server/function.js'
import { getInstanceQueueName } from '../server/instance.js'
import { getJobName } from '../server/job.js'
import { getPubSubPublisherName } from '../server/pubsub.js'
import { getQueueName } from '../server/queue.js'
import { getTaskName } from '../server/task.js'
import { getTopicName } from '../server/topic.js'
import { mockBaselines, mockState, testRegistry } from './setup.js'

const overridable = (registry: Record<string, Mock>, name: string) => {
	const spy = registry[name]

	if (!spy) {
		throw new Error(
			`No test mock exists for "${name}". Make sure the resource is declared in your app config & the tests run through "awsless test".`
		)
	}

	// Calling the proxy sets the mock implementation, while property
	// access forwards to the underlying spy - so the same path works
	// for "mock.function.x.y(response)" & "expect(mock.function.x.y)".
	return new Proxy(spy, {
		apply(_target, _thisArg, args: unknown[]) {
			const impl = args[0]
			const handler = typeof impl === 'function' ? (impl as (...p: unknown[]) => unknown) : async () => impl

			// An override registered outside a running test (module or
			// describe scope) becomes the baseline every test starts
			// from - inside a test it only lasts until the test ends.
			if (!mockState.inTest) {
				mockBaselines.set(spy, handler)
			}

			spy.mockImplementation(handler)
		},
	})
}

// Filled in by the generated type definitions, one member per feature.
// The email entry is static: every app can send email.
export interface TestMock {
	readonly email: {
		/** Every email sent through Email.send, recorded for assertions & overridable like any mock. */
		readonly send: Mock<
			(email: { from?: string; to?: string[]; subject?: string; html?: string }) => unknown
		>
	}
}

// The unified test mock api: every resource of the app is already
// materialized, this overrides behavior & asserts calls.
//
//   mock.function.currency.list([{ code: 'EUR' }])   // canned response
//   mock.function.currency.list(payload => ({ .. })) // custom impl
//   expect(mock.function.currency.list).toHaveBeenCalled()
//   expect(mock.topic.tenantRegistered).not.toHaveBeenCalled()
//   expect(mock.email.send).toHaveBeenCalledWith({ to: [..], subject: .. })
//   mock.config.JWT_SECRET = 'other-value'
export const mock: TestMock = {
	function: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.functions, getFunctionName(name, stack)))
	}),
	task: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.tasks, getTaskName(name, stack)))
	}),
	queue: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.queues, getQueueName(name, stack)))
	}),
	topic: createProxy(name => overridable(testRegistry.topics, getTopicName(name))),
	pubsub: createProxy(name => overridable(testRegistry.pubsub, getPubSubPublisherName(name))),
	alert: createProxy(name => overridable(testRegistry.alerts, getAlertName(name))),
	job: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.jobs, getJobName(name, stack)))
	}),
	instance: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.instances, getInstanceQueueName(name, stack)))
	}),
	// Config values assign like plain properties & read back the
	// current value: mock.config.MAX_BET = '1'
	email: {
		get send() {
			return overridable(testRegistry.emails, 'send')
		},
	},
	config: new Proxy(
		{},
		{
			get(_, name) {
				if (typeof name !== 'string') {
					return undefined
				}

				try {
					return getConfigValue(name)
				} catch (_) {
					return undefined
				}
			},
			set(_, name, value) {
				if (typeof name === 'string') {
					setConfigValue(name, String(value))
				}

				return true
			},
		}
	),
} as TestMock
