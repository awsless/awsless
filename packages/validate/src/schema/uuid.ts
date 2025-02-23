import { UUID } from 'crypto'
import { uuid as base, BaseSchema, ErrorMessage, string } from 'valibot'

export type UuidSchema = BaseSchema<UUID, UUID>

export const uuid = (error?: ErrorMessage): UuidSchema => {
	return string(error ?? 'Invalid UUID', [base()]) as UuidSchema
}
