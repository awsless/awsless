import { $bigfloat } from './bigfloat'
import { $bigint } from './bigint'
import { $date } from './date'
import { $infinity } from './infinity'
import { $map } from './map'
import { $nan } from './nan'
import { $regexp } from './regexp'
import { $set } from './set'
import { $binary } from './binary'
import { $undefined } from './undefined'
import { $url } from './url'

export type Serializable<I, O> = {
	is: (value: unknown) => boolean
	parse: (value: O) => I
	stringify: (value: I) => O
}

export type SerializableTypes = Record<string, Serializable<any, any>>

export const baseTypes: SerializableTypes = {
	$undefined,
	$infinity,
	$bigfloat,
	$bigint,
	$regexp,
	$binary,
	$date,
	$set,
	$map,
	$nan,
	$url,
}
