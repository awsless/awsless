
type Type = 'keyword' | 'text' | 'double' | 'long' | 'boolean' | 'date'

export type AnyStruct = Struct<
	any,
	any,
	any
>

export type Props = {
	type: Type,
	fields?: { sort: { type: 'keyword' } }
} | {
	properties: Record<string, Props>
}

export class Struct<
	Encoded,
	Input,
	Output
> {
	declare readonly ENCODED: Encoded
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output

	constructor(
		readonly encode: (value:Input) => Encoded,
		readonly decode: (value:Encoded) => Output,
		readonly props: Props,
	) {}
}
