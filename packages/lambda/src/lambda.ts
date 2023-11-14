import { Context } from 'aws-lambda'
import { transformValidationErrors } from './errors/validation.js'
import { parse } from '@awsless/validate'
import { Logger, Loggers, Schema, Context as ExtendedContext, Handler, Input } from './type.js'
import { createTimeoutWrap } from './errors/timeout.js'
import { isViewableError } from './errors/viewable.js'
import { getWarmUpEvent, warmUp } from './helpers/warm-up.js'
import { normalizeError } from './helpers/error.js'

interface Options<H extends Handler<S>, S extends Schema = undefined> {
	/** A validation struct to validate the input. */
	schema?: S

	/** Array of middleware functions. */
	handle: H

	/** Array of logging functions that are called when an error is thrown. */
	logger?: Loggers

	/** Boolean to specify if viewable errors should be logged.
	 * @default false
	 */
	logViewableErrors?: boolean
}

export type LambdaFactory = {
	<H extends Handler>(options: Options<H, undefined>): (
		event?: unknown,
		context?: Context
	) => Promise<ReturnType<H>>
	<H extends Handler<S>, S extends Schema>(options: Options<H, S>): (
		event: Input<S>,
		context?: Context
	) => Promise<ReturnType<H>>
}

export type LambdaFunction<H extends Handler<S>, S extends Schema = undefined> = (
	event: Input<S>,
	context?: Context
) => Promise<ReturnType<H>>

/** Create a lambda handle function. */
export const lambda: LambdaFactory = <H extends Handler<S>, S extends Schema = undefined>(
	options: Options<H, S>
): LambdaFunction<H, S> => {
	return async (event: Input<S>, context?: Context): Promise<ReturnType<H>> => {
		const log = async (maybeError: unknown) => {
			const error = normalizeError(maybeError)
			const list = [options.logger].flat(10) as Array<Logger | undefined>

			await Promise.all(
				list.map(logger => {
					return logger?.(error, {
						input: event,
					})
				})
			)
		}

		try {
			const warmUpEvent = getWarmUpEvent(event)

			if (warmUpEvent) {
				await warmUp(warmUpEvent, context)
				// @ts-ignore
				return undefined
			}

			const result = await createTimeoutWrap(context, log, () => {
				return transformValidationErrors(() => {
					const input = options.schema ? parse(options.schema, event) : event
					const extendedContext = { ...(context ?? {}), event, log } as ExtendedContext

					return options.handle(input, extendedContext)
				})
			})

			if (result && process.env.NODE_ENV === 'test') {
				return JSON.parse(JSON.stringify(result))
			}

			return result as ReturnType<H>
		} catch (error) {
			if (!isViewableError(error) || options.logViewableErrors) {
				await log(error)
			}

			throw error
		}
	}
}
