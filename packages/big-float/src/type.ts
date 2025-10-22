export type IBigFloat = {
	readonly exponent: number
	readonly coefficient: bigint
}

export type StringNumericLiteral = `${number}`

export type Numeric = IBigFloat | number | bigint | StringNumericLiteral
