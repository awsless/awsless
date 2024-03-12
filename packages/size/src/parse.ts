import { bytes, gibibytes, kibibytes, mebibytes, pebibytes, tebibytes } from './size'

type BinarySizeUnit = 'B' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB'
type DecimalSizeUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB'

export type SizeUnit = BinarySizeUnit | DecimalSizeUnit
export type SizeFormat = `${number} ${SizeUnit}`

export const parse = (value: SizeFormat) => {
	const [count, unit] = value.split(/\s+/)
	const number = BigInt(count)

	switch (unit) {
		case 'B':
			return bytes(number)
		case 'KB':
		case 'KiB':
			return kibibytes(number)
		case 'MB':
		case 'MiB':
			return mebibytes(number)
		case 'GB':
		case 'GiB':
			return gibibytes(number)
		case 'TB':
		case 'TiB':
			return tebibytes(number)
		case 'PB':
		case 'PiB':
			return pebibytes(number)
	}

	throw new SyntaxError(`Invalid size: ${value}`)
}
