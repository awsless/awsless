import { filesize } from "filesize"
import { style } from "../cli/style"

export const formatByteSize = (size:number) => {
	const [ number, unit ] = filesize(size).toString().split(' ')
	return style.attr(number) + style.attr.dim(unit)
}
