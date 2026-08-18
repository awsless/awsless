import { bytes, format } from '@awsless/size'
import { color } from '../cli/ui/style.js'

export const formatByteSize = (size: number) => {
	const [number, unit] = format(bytes(size)).split(' ')
	return color.attr(number) + color.attr.dim(unit)
}
