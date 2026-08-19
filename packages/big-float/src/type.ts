export type IBigFloat = {
	readonly exponent: number
	readonly coefficient: bigint
	toString(radix?: number): StringNumericLiteral
}

export type StringNumericLiteral = `${number}`

export type Numeric = IBigFloat | number | bigint | StringNumericLiteral
