import { UUID } from 'crypto'
import { uuid as base, BaseSchema, ErrorMessage, GenericIssue, pipe, string } from 'valibot'

export type UuidSchema = BaseSchema<UUID, UUID, GenericIssue>

export const uuid = (message: ErrorMessage<GenericIssue> = 'Invalid UUID'): UuidSchema => {
	return pipe(string(message), base(message)) as UuidSchema
}
