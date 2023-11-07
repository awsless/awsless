import { BaseSchema, string, transform, Output, SchemaWithTransform, StringSchema } from 'valibot'

export type JsonSchema<T extends BaseSchema> = SchemaWithTransform<StringSchema, Output<T>>

export const json = <T extends BaseSchema>(schema: T): JsonSchema<T> => {
	return transform(
		string(),
		value => {
			try {
				return JSON.parse(value)
			} catch (error) {
				return null
			}
		},
		schema
	)
}
