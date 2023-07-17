
import { Size as CDKSize } from 'aws-cdk-lib/core'

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
