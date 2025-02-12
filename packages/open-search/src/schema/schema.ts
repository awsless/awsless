type Type = 'keyword' | 'text' | 'double' | 'long' | 'boolean' | 'date'

export type AnySchema = Schema<any, any, any>

export type Fields = Record<string, Mapping>

export type Mapping =
	| {
			type: Type
			fields?: Fields
	  }
	| {
			properties: Record<string, Mapping>
	  }

export type SchemaProps = {
	type?: Type
	fields?: Fields
}

export class Schema<Encoded, Input, Output> {
	declare readonly ENCODED: Encoded
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output

	constructor(
		readonly encode: (value: Input) => Encoded,
		readonly decode: (value: Encoded) => Output,
		readonly mapping: Mapping
	) {}
}
