import { AsyncLocalStorage } from 'node:async_hooks'
import { flushTraces, withTraceHeader } from '@awsless/utils'
import { GenericSchema, parse } from '@awsless/validate'
import { Context as AwsContext } from 'aws-lambda'
import { eventContext } from './context/lambda-context.js'
import { startTimeoutWarning } from './errors/timeout.js'
import { transformValidationErrors } from './errors/validation.js'
import { Context } from './type.js'

// A failed run by its error, which can be any thrown value, undefined included.
export type InvocationFailure = { readonly error: unknown }

// Runs a callback in the handler's async context, so work done after it
// returned, like reading a streamed body, still reaches getContext().
export type RunInContext = <R>(callback: () => R) => R

export type Invocation<T> = {
	readonly runInContext: RunInContext
	/**
	 * Stops the timeout warning, runs the success or failure callbacks, then the
	 * finally callbacks, and flushes the traces, once. A lambda calls it when its
	 * handler is done; a route that streams its response, when the stream ends.
	 */
	readonly finishInvocation: (failure?: InvocationFailure) => Promise<void>
} & ({ readonly isSuccessful: true; readonly result: T } | { readonly isSuccessful: false; readonly error: unknown })

/**
 * One run of a handler: its input validated, the extended context that
 * getContext() returns, and the timeout warning. A failed run is answered,
 * not thrown, so its caller can log the error before finishing.
 */
export const runInvocation = async <T>(options: {
	schema?: GenericSchema
	// What the schema validates, and what an error logs (redacted by the schema).
	input: unknown
	raw: unknown
	context?: AwsContext
	log?: (error: unknown) => Promise<void>
	handle: (input: unknown, context: Context) => T
}): Promise<Invocation<Awaited<T>>> => {
	const log = options.log ?? (async () => {})
	const successCallbacks: Array<(result: unknown) => unknown> = []
	const failureCallbacks: Array<(error: unknown) => unknown> = []
	const finallyCallbacks: Array<() => unknown> = []
	let result: Awaited<T> | undefined
	let finishPromise: Promise<void> | undefined
	let runInContext: RunInContext = callback => callback()

	// Until the invocation finishes, which for a stream is after its handler returns.
	const stopTimeoutWarning = startTimeoutWarning(options.schema, options.input, options.context, log)

	// A failure or finally callback that throws is logged, but never takes the
	// place of the run's own outcome.
	const runSettled = async (callbacks: Array<() => unknown>) => {
		const results = await Promise.allSettled(callbacks.map(async callback => callback()))

		for (const settled of results) {
			if (settled.status === 'rejected') {
				console.error(settled.reason)
				await log(settled.reason).catch(() => {})
			}
		}
	}

	const runCallbacks = async (failure?: InvocationFailure) => {
		stopTimeoutWarning()

		try {
			if (failure) {
				await runSettled(failureCallbacks.map(callback => () => callback(failure.error)))
				return
			}

			try {
				await Promise.all(successCallbacks.map(callback => callback(result)))
			} catch (callbackError) {
				// A success callback that fails fails the run.
				await runSettled(failureCallbacks.map(callback => () => callback(callbackError)))
				throw callbackError
			}
		} finally {
			await runSettled(finallyCallbacks)
			// The spans still on their way go out before Lambda freezes the process.
			await flushTraces()
		}
	}

	// A second call waits for the first one's callbacks.
	const finishInvocation = (failure?: InvocationFailure) => (finishPromise ??= runCallbacks(failure))

	// The invocation's trace header (Lambda Managed Instances give it on the
	// context only, without _X_AMZN_TRACE_ID); a handler inside another keeps its caller's.
	const xRayTraceId = (options.context as (AwsContext & { xRayTraceId?: string }) | undefined)?.xRayTraceId

	try {
		result = await withTraceHeader(xRayTraceId, () =>
			transformValidationErrors(() => {
				const event = options.schema ? parse(options.schema, options.input) : options.input
				const context: Context = {
					event,
					context: options.context,
					raw: options.raw,
					log,
					onSuccess(callback) {
						successCallbacks.push(callback)
					},
					onFailure(callback) {
						failureCallbacks.push(callback)
					},
					onFinally(callback) {
						finallyCallbacks.push(callback)
					},
				}

				return eventContext.run(context, async () => {
					const handled = await options.handle(event, context)
					runInContext = AsyncLocalStorage.snapshot() as RunInContext
					return handled
				})
			})
		)
	} catch (error) {
		return { isSuccessful: false, error, runInContext, finishInvocation }
	}

	return { isSuccessful: true, result: result as Awaited<T>, runInContext, finishInvocation }
}
