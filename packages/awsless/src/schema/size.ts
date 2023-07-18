
import { Size as CDKSize } from 'aws-cdk-lib/core'
import { z } from 'zod'

export type Size = `${number} ${'KB' | 'MB' | 'GB'}`

export function toSize(size: Size): CDKSize {
	const [count, unit] = size.split(' ')
	const countNum = parseInt(count)
	if (unit === 'KB') {
		return CDKSize.kibibytes(countNum)
	} else if (unit === 'MB') {
		return CDKSize.mebibytes(countNum)
	} else if (unit === 'GB') {
		return CDKSize.gibibytes(countNum)
	}

	throw new TypeError(`Invalid size ${size}`)
}

export const SizeSchema = z.custom<Size>((value) => {
	return z.string()
		.regex(/[0-9]+ (KB|MB|GB)/, 'Invalid size')
		// .refine<Size>((size): size is Size => {
		// 	const [ str ] = size.split(' ')
		// 	const number = parseInt(str)
		// 	return number > 0
		// }, 'Size must be greater then zero')
		.parse(value)
}).transform<CDKSize>(toSize)
