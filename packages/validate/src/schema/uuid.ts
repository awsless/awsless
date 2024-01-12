import { UUID } from 'crypto'
import { string, uuid as base, transform, StringSchema, SchemaWithTransform, ErrorMessage } from 'valibot'

export type UuidSchema = SchemaWithTransform<StringSchema, UUID>

export const uuid = (error?: ErrorMessage): UuidSchema => {
	return transform(string(error ?? 'Invalid UUID', [base()]), v => v as UUID)
}
