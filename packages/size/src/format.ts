import { SizeFormat, SizeUnit } from './parse'
import { Size } from './size'

const UNITS: SizeUnit[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export const format = (size: Size): SizeFormat => {
	let value = Number(size.value)
	let index = 0

	while (value >= 1024 && index < UNITS.length - 1) {
		value = value / 1024
		index++
	}

	const rounded = Math.round(value * 100) / 100

	return `${rounded} ${UNITS[index]!}` as SizeFormat
}
