const BI = 1024n
const KIBI = BI
const MEBI = KIBI * BI
const GIBI = MEBI * BI
const TEBI = GIBI * BI
const PEBI = TEBI * BI

// const BASE_10 = 1000n
// const KILO = BASE_10
// const MEGA = KILO * BI
// const GIGA = MEGA * BI
// const TERA = GIGA * BI
// const PETA = TERA * BI

export class Size {
	constructor(readonly value: bigint) {}
}

export const bytes = (value: number | bigint) => {
	return new Size(BigInt(value))
}

export const kibibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * KIBI)
}

// export const kilobytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * KILO)
// }

export const mebibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * MEBI)
}

// export const megabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * MEGA)
// }

export const gibibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * GIBI)
}

// export const gigabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * GIGA)
// }

export const tebibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * TEBI)
}

// export const terabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * TERA)
// }

export const pebibytes = (value: number | bigint) => {
	return new Size(BigInt(value) * PEBI)
}

// export const petabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * PETA)
// }

export const toBytes = (size: Size) => {
	return size.value
}

export const toKibibytes = (size: Size) => {
	return size.value / KIBI
}

// export const toKilobytes = (size: Size) => {
// 	return size.value / KILO
// }

export const toMebibytes = (size: Size) => {
	return size.value / MEBI
}

// export const toMegabytes = (size: Size) => {
// 	return size.value / MEGA
// }

export const toGibibytes = (size: Size) => {
	return size.value / GIBI
}

// export const toGigabytes = (size: Size) => {
// 	return size.value / GIGA
// }

export const toTebibytes = (size: Size) => {
	return size.value / TEBI
}

// export const toTerabytes = (size: Size) => {
// 	return size.value / TERA
// }

export const toPebibytes = (size: Size) => {
	return size.value / PEBI
}

// export const toPetabytes = (size: Size) => {
// 	return size.value / PETA
// }
