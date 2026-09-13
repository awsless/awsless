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

type MockResult<R> =
	| { type: 'return'; value: R }
	| { type: 'throw'; value: any }
	| { type: 'incomplete'; value: undefined }

type MockSettledResult<R> =
	| { type: 'fulfilled'; value: R }
	| { type: 'rejected'; value: any }
	| { type: 'incomplete'; value: undefined }

// The full shape of a vitest Mock, declared structurally so the shipped
// types never require the optional vitest peer.
export interface TestMockFunction<F extends AnyFunction = AnyFunction> {
	(...args: Parameters<F>): ReturnType<F>
	mock: {
		calls: Parameters<F>[]
		instances: ThisParameterType<F>[]
		contexts: ThisParameterType<F>[]
		invocationCallOrder: number[]
		results: MockResult<ReturnType<F>>[]
		settledResults: MockSettledResult<Awaited<ReturnType<F>>>[]
		lastCall: Parameters<F> | undefined
	}
	getMockName(): string
	mockName(name: string): this
	mockClear(): this
	mockReset(): this
	mockRestore(): void
	getMockImplementation(): F | undefined
	mockImplementation(fn: F): this
	mockImplementationOnce(fn: F): this
	withImplementation(fn: F, cb: () => Promise<unknown>): Promise<this>
	withImplementation(fn: F, cb: () => unknown): this
	mockReturnThis(): this
	mockReturnValue(value: ReturnType<F>): this
	mockReturnValueOnce(value: ReturnType<F>): this
	mockThrow(value: unknown): this
	mockThrowOnce(value: unknown): this
	mockResolvedValue(value: Awaited<ReturnType<F>>): this
	mockResolvedValueOnce(value: Awaited<ReturnType<F>>): this
	mockRejectedValue(error: unknown): this
	mockRejectedValueOnce(error: unknown): this
	[Symbol.dispose](): void
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

	// Calling sets the implementation, property access forwards to the spy,
	// so one path serves both mock.x.y(response) & expect(mock.x.y).
	return new Proxy(spy, {
		apply(_target, _thisArg, args: unknown[]) {
			const impl = args[0]
			const handler = typeof impl === 'function' ? (impl as (...p: unknown[]) => unknown) : async () => impl

			// Outside a running test the override is the baseline every test starts from.
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
		readonly send: TestMockFunction<
			(email: { from?: string; to?: string[]; subject?: string; html?: string }) => unknown
		>
	}
}

// Overrides behavior & asserts calls on the materialized resources:
// mock.function.x.y(response) sets, expect(mock.function.x.y) asserts.
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
