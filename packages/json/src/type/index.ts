import { $bigfloat } from './bigfloat'
import { $bigint } from './bigint'
import { $date } from './date'
import { $map } from './map'
import { $set } from './set'
import { $undefined } from './undefined'

export type Serializable<I, O> = {
	is: (value: unknown) => value is I
	parse: (value: O) => I
	stringify: (value: I) => O
}

export type SerializableTypes = Record<string, Serializable<any, any>>

export const baseTypes: SerializableTypes = {
	$undefined,
	$bigfloat,
	$bigint,
	$date,
	$set,
	$map,
}
