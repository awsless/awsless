export type AnySchema = Schema<any, any, any>

// A column: its ClickHouse type, & how a value travels to the server &
// back in JSONEachRow rows.
export class Schema<Encoded, Input, Output> {
	declare readonly ENCODED: Encoded
	declare readonly INPUT: Input
	declare readonly OUTPUT: Output

	constructor(
		readonly encode: (value: Input) => Encoded,
		readonly decode: (value: Encoded) => Output,
		readonly type: string
	) {}
}
