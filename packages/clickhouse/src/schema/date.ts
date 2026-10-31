import { Schema } from './schema'

export type DateProps = {
	// Digits after the second: 3 keeps milliseconds, 0 whole seconds.
	precision?: number
	timeZone?: string
}

// Dates travel as ISO strings both ways, so no time zone gets lost.
export const date = ({ precision = 3, timeZone = 'UTC' }: DateProps = {}) =>
	new Schema<string, Date, Date>(
		value => value.toISOString(),
		value => new Date(value),
		precision === 0 ? `DateTime('${timeZone}')` : `DateTime64(${precision}, '${timeZone}')`
	)
