import { parse } from '@awsless/json'
import { BaseSchema, Output, SchemaWithTransform, string, StringSchema, transform } from 'valibot'

export type JsonSchema<T extends BaseSchema> = SchemaWithTransform<StringSchema, Output<T>>

export const json = <T extends BaseSchema>(schema: T): JsonSchema<T> => {
	return transform(
		string(),
		value => {
			try {
				return parse(value)
			} catch (error) {
				return null
			}
		},
		schema
	)
}
