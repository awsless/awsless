import { filesize } from 'filesize'
import { color } from '../cli/ui/style.js'

export const formatByteSize = (size: number) => {
	const [number, unit] = filesize(size).toString().split(' ')
	return color.attr(number) + color.attr.dim(unit)
}
