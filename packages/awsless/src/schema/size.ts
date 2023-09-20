
import { z } from 'zod'
import { Size } from '../formation/property/size'

export type SizeFormat = `${number} ${'KB' | 'MB' | 'GB'}`

export function toSize(size: SizeFormat): Size {
	const [count, unit] = size.split(' ')
	const countNum = parseInt(count)

	if (unit === 'KB') {
		return Size.kiloBytes(countNum)
	} else if (unit === 'MB') {
		return Size.megaBytes(countNum)
	} else if (unit === 'GB') {
		return Size.gigaBytes(countNum)
	}

	throw new TypeError(`Invalid size ${size}`)
}

export const SizeSchema = z.custom<SizeFormat>((value) => {
	return z.string()
		.regex(/^[0-9]+ (KB|MB|GB)$/)
		.safeParse(value).success
}, 'Invalid size').transform<Size>(toSize)

export const sizeMin = (min: Size) => {
	return (size: Size) => {
		return size.toBytes() >= min.toBytes()
	}
}

export const sizeMax = (max: Size) => {
	return (size: Size) => {
		return size.toBytes() <= max.toBytes()
	}
}
