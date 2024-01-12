const SECONDS = 1000n
const MINUTES = SECONDS * 60n
const HOURS = MINUTES * 60n
const DAYS = HOURS * 24n

export class Duration {
	constructor(readonly value: bigint) {}
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

export const toDays = (duration: Duration) => {
	return duration.value / DAYS
}

export const toHours = (duration: Duration) => {
	return duration.value / HOURS
}

export const toMinutes = (duration: Duration) => {
	return duration.value / MINUTES
}

export const toSeconds = (duration: Duration) => {
	return duration.value / SECONDS
}

export const toMilliSeconds = (duration: Duration) => {
	return duration.value
}
