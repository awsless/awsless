const BI = 1024n

const KIBI = BI
const MEBI = KIBI * BI
const GIBI = MEBI * BI
const TEBI = GIBI * BI
const PEBI = TEBI * BI

export class Size {
	constructor(readonly value: bigint) {}
}

export const bytes = (value: number | bigint) => {
	return new Size(BigInt(value))
}

export const kibibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * KIBI)
}

export const mebibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * MEBI)
}

export const gibibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * GIBI)
}

export const tebibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * TEBI)
}

export const pebibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * PEBI)
}

export const toBytes = (size: Size) => {
	return size.value
}

export const toKibibytes = (size: Size) => {
	return size.value / KIBI
}

export const toMebibytes = (size: Size) => {
	return size.value / MEBI
}

export const toGibibytes = (size: Size) => {
	return size.value / GIBI
}

export const toTebibytes = (size: Size) => {
	return size.value / TEBI
}

export const toPebibytes = (size: Size) => {
	return size.value / PEBI
}
