import { Duration } from '@awsless/duration'
import { Serializable } from '.'

export const $duration: Serializable<Duration, string> = {
	is: v => v instanceof Duration,
	parse: v => new Duration(BigInt(v)),
	stringify: v => v.value.toString(),
}
