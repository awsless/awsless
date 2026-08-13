import { z } from 'zod'
import { Size, SizeFormat, parse } from '@awsless/size'

export const SizeSchema = z
	.string()
	.regex(/^[0-9]+ (B|KB|MB|GB|TB|PB)$/, 'Invalid size')
	.transform<Size>(v => parse(v as SizeFormat))

export const sizeMin = (min: Size) => {
	return (size: Size) => {
		return size.value >= min.value
	}
}

export const sizeMax = (max: Size) => {
	return (size: Size) => {
		return size.value <= max.value
	}
}
