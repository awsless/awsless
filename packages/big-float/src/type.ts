export type IBigFloat = {
	readonly exponent: number
	readonly coefficient: bigint
}

export type Numeric = IBigFloat | number | bigint | string
