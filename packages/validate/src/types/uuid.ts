
import type { UUID } from 'crypto'
import { define, Struct } from 'superstruct'

export const uuid = ():Struct<UUID, null> => {
	return define<UUID>('uuid', (value) => {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))
	})
}
