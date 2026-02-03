import { parse } from '@awsless/json'
import { BaseSchema, ErrorMessage, GenericIssue, GenericSchema, InferOutput, pipe, rawTransform, string } from 'valibot'

export type JsonSchema<T extends GenericSchema> = BaseSchema<string, InferOutput<T>, GenericIssue>

export const json = <T extends GenericSchema>(
	schema: T,
	message: ErrorMessage<GenericIssue> = 'Invalid JSON'
): JsonSchema<T> => {
	return pipe(
		string(message),
		rawTransform(ctx => {
			let result: unknown

			try {
				result = parse(ctx.dataset.value)
			} catch (_error) {
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
