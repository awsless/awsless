import { Duration, milliSeconds, toMilliSeconds } from '@awsless/duration'
import { bytes, Size, toBytes } from '@awsless/size'
import { Unit } from '../util/unit'

export type CreateMetricProps<T = number> = {
	namespace: string
	name: string
	unit?: Unit
	resolution?: 'standard' | 'high'
	decode?: (value: T) => number
	encode?: (value: number) => T
}

export type Metric<T> = {
	namespace: string
	name: string
	unit: Unit
	resolution: 'standard' | 'high'
	decode: (value: T) => number
	encode: (value: number) => T
}

export const createMetric = <T = number>(props: CreateMetricProps<T>): Metric<T> => {
	return {
		resolution: 'standard',
		unit: 'number',
		decode: v => v as number,
		encode: v => v as T,
		...props,
	}
}

type PartialProps<T> = Pick<CreateMetricProps<T>, 'name' | 'namespace' | 'resolution'>

export const createDurationMetric = (props: PartialProps<Duration>) => {
	return createMetric<Duration>({
		...props,
		unit: 'duration',
		encode(value) {
			return milliSeconds(value)
		},
		decode(value) {
			return toMilliSeconds(value)
		},
	})
}

export const createSizeMetric = (props: PartialProps<Size>) => {
	return createMetric<Size>({
		...props,
		unit: 'size',
		encode(value) {
			return bytes(value)
		},
		decode(value) {
			return toBytes(value)
		},
	})
}
