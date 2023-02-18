
import { Context } from 'aws-lambda'
import { transformValidationErrors } from './errors/validation.js'
import { create } from '@heat/validate'
import { Input, Logger, Loggers, OptStruct, Output, Context as ExtendedContext, Handler } from './types.js'
import { createTimeout } from './errors/timeout.js'
import { isViewableError } from './errors/viewable.js'
import { getWarmUpEvent, warmUp } from './helpers/warm-up.js'
import { normalizeError } from './helpers/error.js'

interface Options<H extends Handler<I, O>, I extends OptStruct = undefined, O extends OptStruct = undefined> {
	/** A validation struct to validate the input. */
	input?: I

	/** A validation struct to validate the output. */
	output?: O

	/** Array of middleware functions */
	handle: H

	/** Array of logging functions that are called when an error is thrown */
	logger?: Loggers

	/** Boolean to specify if viewable errors should be logged */
	logViewableErrors?: boolean
}

export type LambdaFactory = {
	<H extends Handler>(options:Options<H, undefined, undefined>): (event?:unknown, context?:Context) => Promise<ReturnType<H>>
	<H extends Handler<I>, I extends OptStruct>(options:Options<H, I, undefined>): (event:Input<I>, context?:Context) => Promise<ReturnType<H>>
	<H extends Handler<undefined, O>, O extends OptStruct>(options:Options<H, undefined, O>): (event?:unknown, context?:Context) => Promise<Output<O>>
	<H extends Handler<I, O>, I extends OptStruct, O extends OptStruct>(options:Options<H, I, O>): (event:Input<I>, context?:Context) => Promise<Output<O>>
}

export type LambdaFunction<I extends OptStruct = undefined, O extends OptStruct = undefined> = (
	event: Input<I>,
	context?:Context
) => Promise<Output<O>>

/** Create a lambda handle function. */
export const lambda:LambdaFactory = <
	H extends Handler<I, O>,
	I extends OptStruct = undefined,
	O extends OptStruct = undefined,
>(options:Options<H, I, O>): LambdaFunction<I, O> => {

	return async (event: Input<I>, context?:Context):Promise<Output<O>> => {

		const log = async (maybeError:unknown) => {
			const error = normalizeError(maybeError)
			const list = [ options.logger ].flat(10) as Logger[]
			await Promise.all(list.map(logger => {
				return logger && logger(error, {
					input: event
				})
			}))
		}

		try {
			const warmUpEvent = getWarmUpEvent(event)

			if(warmUpEvent) {
				await warmUp(warmUpEvent, context)
				// @ts-ignore
				return undefined
			}

			const timeout = createTimeout(context, (error) => { log(error) })
			const input = await transformValidationErrors(() => options.input ? create(event, options.input) : event) as Input<I>
			const extendedContext = { ...(context || {}), event, log } as ExtendedContext
			const output:Output<O> = await transformValidationErrors(() => options.handle(input, extendedContext))

			clearTimeout(timeout)

			return (options.output ? create(output, options.output) : output) as Output<O>

		} catch(error) {
			if(!isViewableError(error) || options.logViewableErrors) {
				await log(error)
			}

			throw error
		}
	}
}
