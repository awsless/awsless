import { parse, stringify } from '@awsless/json'
import { BaseSchema, ErrorMessage, GenericIssue, GenericSchema, InferOutput, pipe, rawTransform, string } from 'valibot'
import { applyRedaction, redactWith } from '../action/redact.js'

export type JsonSchema<T extends GenericSchema> = BaseSchema<string, InferOutput<T>, GenericIssue>

export const json = <T extends GenericSchema>(
	schema: T,
	message: ErrorMessage<GenericIssue> = 'Invalid JSON'
): JsonSchema<T> => {
	return pipe(
		string(message),
		// A logged json string is redacted by what it holds.
		redactWith(input => {
			if (typeof input !== 'string') {
				return applyRedaction(schema, input)
			}

			try {
				return stringify(applyRedaction(schema, parse(input)))
			} catch {
				return input
			}
		}),
		rawTransform(ctx => {
			let result: unknown

			try {
				result = parse(ctx.dataset.value)
			} catch {
				ctx.addIssue({
					message,
				})
				return ctx.NEVER
			}

			return result
		}),
		schema
	)
}
