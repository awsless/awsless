import { createHash } from 'node:crypto'
import type { UUID } from 'node:crypto'

// The same name always yields the same uuid, so reseeding upserts &
// other seed files can reference records by name.
export const seed = {
	uuid(name: string): UUID {
		const hash = createHash('sha256').update(name).digest()

		// The version & variant bits make it a valid (v5 style) uuid.
		hash[6] = (hash[6]! & 0x0f) | 0x50
		hash[8] = (hash[8]! & 0x3f) | 0x80

		const hex = hash.subarray(0, 16).toString('hex')

		return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join(
			'-'
		) as UUID
	},
}
