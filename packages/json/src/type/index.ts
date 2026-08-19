import { $bigfloat } from './bigfloat'
import { $bigint } from './bigint'
import { $binary } from './binary'
import { $date } from './date'
import { $duration } from './duration'
import { $infinity } from './infinity'
import { $map } from './map'
import { $nan } from './nan'
import { $regexp } from './regexp'
import { $set } from './set'
import { $undefined } from './undefined'
import { $url } from './url'

export type Serializable<I, O> = {
	is: (value: unknown) => boolean
	stringify: (value: I) => O
} & (
	| {
			parse: (value: O) => I
	  }
	| {
			replace: (value: O) => I
	  }
)

export type SerializableTypes = Record<string, Serializable<any, any>>

export const baseTypes: SerializableTypes = {
	$undefined,
	$duration,
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
