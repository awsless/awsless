const SECONDS = 1000n
const MINUTES = SECONDS * 60n
const HOURS = MINUTES * 60n
const DAYS = HOURS * 24n
const WEEKS = DAYS * 7n

export class Duration {
	constructor(readonly value: bigint) {}
}

// factories

export const weeks = (value: number | bigint) => {
	return new Duration(BigInt(value) * WEEKS)
}

export const days = (value: number | bigint) => {
	return new Duration(BigInt(value) * DAYS)
}

export const hours = (value: number | bigint) => {
	return new Duration(BigInt(value) * HOURS)
}

export const minutes = (value: number | bigint) => {
	return new Duration(BigInt(value) * MINUTES)
}

export const seconds = (value: number | bigint) => {
	return new Duration(BigInt(value) * SECONDS)
}

export const milliSeconds = (value: number | bigint) => {
	return new Duration(BigInt(value))
}

// transforms

export const toWeeks = (duration: Duration) => {
	return Number(toSafeWeeks(duration))
}

export const toDays = (duration: Duration) => {
	return Number(toSafeDays(duration))
}

export const toHours = (duration: Duration) => {
	return Number(toSafeHours(duration))
}

export const toMinutes = (duration: Duration) => {
	return Number(toSafeMinutes(duration))
}

export const toSeconds = (duration: Duration) => {
	return Number(toSafeSeconds(duration))
}

export const toMilliSeconds = (duration: Duration) => {
	return Number(toSafeMilliSeconds(duration))
}

// safe bigint transforms

export const toSafeWeeks = (duration: Duration) => {
	return duration.value / WEEKS
}

export const toSafeDays = (duration: Duration) => {
	return duration.value / DAYS
}

export const toSafeHours = (duration: Duration) => {
	return duration.value / HOURS
}

export const toSafeMinutes = (duration: Duration) => {
	return duration.value / MINUTES
}

export const toSafeSeconds = (duration: Duration) => {
	return duration.value / SECONDS
}

export const toSafeMilliSeconds = (duration: Duration) => {
	return duration.value
}
