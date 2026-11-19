import { AnySchema, Schema } from './schema'

export type Entries = Record<string, AnySchema>

// Optional columns may be left out of an insert.
type OptionalKeys<S extends Entries> = { [K in keyof S]: S[K] extends { OPTIONAL: true } ? K : never }[keyof S]

type InferInput<S extends Entries> = { [K in Exclude<keyof S, OptionalKeys<S>>]: S[K]['INPUT'] } & {
	[K in OptionalKeys<S>]?: S[K]['INPUT']
}
type InferOutput<S extends Entries> = { [K in keyof S]: S[K]['OUTPUT'] }
type InferEncoded<S extends Entries> = { [K in keyof S]: S[K]['ENCODED'] }

export class ObjectSchema<T extends Entries> extends Schema<InferEncoded<T>, InferInput<T>, InferOutput<T>> {
	// Every column with its ClickHouse type, in declaration order.
	readonly columns: Record<string, string>

	constructor(readonly entries: T) {
		super(
			input => {
				const encoded: Record<string, unknown> = {}

				for (const key in input) {
					const entry = entries[key]

					if (!entry) {
						throw new TypeError(`No '${key}' column present on the schema.`)
					}

					// A left out column isn't written, so the server fills it in.
					if ((input as Record<string, unknown>)[key] !== undefined) {
						encoded[key] = entry.encode((input as Record<string, unknown>)[key] as never)
					}
				}

				return encoded as InferEncoded<T>
			},
			encoded => {
				const output: Record<string, unknown> = {}

				// Queries can select a few columns or add computed ones, which
				// pass through as they came.
				for (const key in encoded) {
					const entry = entries[key]
					output[key] = entry ? entry.decode(encoded[key]) : encoded[key]
				}

				return output as InferOutput<T>
			},
			`Tuple(${Object.entries(entries)
				.map(([key, entry]) => `${key} ${entry.type}`)
				.join(', ')})`
		)

		this.columns = Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, entry.type]))
	}
}

export type AnyObjectSchema = ObjectSchema<any>

// The columns of a table row.
export const object = <T extends Entries>(entries: T) => new ObjectSchema(entries)
