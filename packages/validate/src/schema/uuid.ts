import { UUID } from 'crypto'
import { BaseSchema, string, uuid as base, transform, StringSchema, SchemaWithTransform } from 'valibot'

export type UuidSchema = SchemaWithTransform<StringSchema | BaseSchema<UUID>, UUID>

export const uuid = (): UuidSchema => {
	return transform(string([base()]), v => v as UUID)
}
