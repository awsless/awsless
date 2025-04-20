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

// export const kilobytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * KILO)
// }

// export const megabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * MEGA)
// }

// export const gigabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * GIGA)
// }

// export const terabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * TERA)
// }

// export const petabytes = (value: number | bigint) => {
// 	return new Size(BigInt(value) * PETA)
// }

// export const toKilobytes = (size: Size) => {
// 	return size.value / KILO
// }
// export const toMegabytes = (size: Size) => {
// 	return size.value / MEGA
// }
// export const toGigabytes = (size: Size) => {
// 	return size.value / GIGA
// }
// export const toTerabytes = (size: Size) => {
// 	return size.value / TERA
// }
// export const toPetabytes = (size: Size) => {
// 	return size.value / PETA
// }

export class Size {
	constructor(readonly value: bigint) {}
}

// factories

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

// transforms

export const toBytes = (size: Size) => {
	return Number(toSafeBytes(size))
}

export const toKibibytes = (size: Size) => {
	return Number(toSafeKibibytes(size))
}

export const toMebibytes = (size: Size) => {
	return Number(toSafeMebibytes(size))
}

export const toGibibytes = (size: Size) => {
	return Number(toSafeGibibytes(size))
}

export const toTebibytes = (size: Size) => {
	return Number(toSafeTebibytes(size))
}

export const toPebibytes = (size: Size) => {
	return Number(toSafePebibytes(size))
}

// safe bigint transforms

export const toSafeBytes = (size: Size) => {
	return size.value
}

export const toSafeKibibytes = (size: Size) => {
	return size.value / KIBI
}

export const toSafeMebibytes = (size: Size) => {
	return size.value / MEBI
}

export const toSafeGibibytes = (size: Size) => {
	return size.value / GIBI
}

export const toSafeTebibytes = (size: Size) => {
	return size.value / TEBI
}

export const toSafePebibytes = (size: Size) => {
	return size.value / PEBI
}
