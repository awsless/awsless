import { createProxy } from '../proxy.js'
import { getAlertName } from '../server/alert.js'
import { getConfigValue, setConfigValue } from '../server/config.js'
import { getCronName } from '../server/cron.js'
import { getFunctionName } from '../server/function.js'
import { getInstanceQueueName } from '../server/instance.js'
import { getJobName } from '../server/job.js'
import { getPubSubPublisherName } from '../server/pubsub.js'
import { getQueueName } from '../server/queue.js'
import { getTaskName } from '../server/task.js'
import { getTopicName } from '../server/topic.js'
import { mockBaselines, mockState, testRegistry } from './setup.js'

type AnyFunction = (...args: any[]) => any

// The structural shape of a vitest mock. Declared here instead of
// imported, so the shipped types never require vitest - an optional
// peer that consumers without tests don't install.
export interface TestMockFunction<F extends AnyFunction = AnyFunction> {
	(...args: Parameters<F>): ReturnType<F>
	readonly mock: {
		readonly calls: Parameters<F>[]
		readonly results: { type: 'return' | 'throw' | 'incomplete'; value: any }[]
		readonly invocationCallOrder: number[]
		readonly lastCall: Parameters<F> | undefined
	}
	getMockName(): string
	mockName(name: string): this
	mockClear(): this
	mockReset(): this
	mockRestore(): void
	mockImplementation(fn: F): this
	mockImplementationOnce(fn: F): this
	mockReturnValue(value: ReturnType<F>): this
	mockReturnValueOnce(value: ReturnType<F>): this
	mockResolvedValue(value: Awaited<ReturnType<F>>): this
	mockResolvedValueOnce(value: Awaited<ReturnType<F>>): this
	mockRejectedValue(error: unknown): this
	mockRejectedValueOnce(error: unknown): this
}

const overridable = (
	registry: Record<string, TestMockFunction>,
	name: string,
	children: Record<string, () => unknown> = {}
) => {
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
		get(target, prop, receiver) {
			if (typeof prop === 'string' && Object.hasOwn(children, prop)) {
				return children[prop]!()
			}

			return Reflect.get(target, prop, receiver)
		},
	})
}

// Filled in by the generated type definitions, one member per feature.
// The email entry is static: every app can send email.
export interface TestMock {
	readonly email: {
		/** Every email sent through Email.send, recorded for assertions & overridable like any mock. */
		readonly send: TestMockFunction<(email: { from?: string; to?: string[]; subject?: string; html?: string }) => unknown>
	}
}

// The unified test mock api: every resource of the app is already
// materialized, this overrides behavior & asserts calls.
//
//   mock.function.currency.list([{ code: 'EUR' }])   // canned response
//   mock.function.currency.list(payload => ({ .. })) // custom impl
//   expect(mock.function.currency.list).toHaveBeenCalled()
//   expect(mock.task.todo.remind.scheduled).toHaveBeenCalled()
//   expect(mock.topic.tenantRegistered).not.toHaveBeenCalled()
//   expect(mock.email.send).toHaveBeenCalledWith({ to: [..], subject: .. })
//   mock.config.JWT_SECRET = 'other-value'
export const mock: TestMock = {
	function: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.functions, getFunctionName(name, stack)))
	}),
	cron: createProxy(stack => {
		return createProxy(name => overridable(testRegistry.crons, getCronName(name, stack)))
	}),
	// A scheduled task records on the `scheduled` spy before it runs
	// the task, so a test can tell a schedule from a direct invoke.
	task: createProxy(stack => {
		return createProxy(name => {
			const task = getTaskName(name, stack)

			return overridable(testRegistry.tasks, task, {
				scheduled: () => overridable(testRegistry.schedules, task),
			})
		})
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
	email: {
		get send() {
			return overridable(testRegistry.emails, 'send')
		},
	},
	// Config values assign like plain properties & read back the
	// current value: mock.config.MAX_BET = '1'
	config: new Proxy(
		{},
		{
			get(_, name) {
				if (typeof name !== 'string') {
					return undefined
				}

				try {
					return getConfigValue(name)
				} catch {
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
