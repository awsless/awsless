import { define } from '../table'
import { array } from './array'
import { number } from './number'
import { object } from './object'
import { AnySchema, Schema } from './schema'
import { string } from './string'

type ObjectVariantSchema<T extends string> = Schema<
	//
	'M',
	{ [K in T]: string } & Record<string, any>,
	{ [K in T]: string } & Record<string, any>,
	// any,
	// any,
	Array<string | number>,
	Array<string | number>,
	boolean
>

// export const literal = <T extends string, O extends ObjectVariantSchema<T>[]>(type: T, options: O) =>
// 	new Schema<'M', S['INPUT'][], S['OUTPUT'][], ArrayPaths<S>, ArrayOptPaths<S>>(
// 		'M',
// 		unmarshalled => ({ L: unmarshalled.map(item => schema.marshall(item) as MarshallInputTypes) }),
// 		marshalled => marshalled.L.map(item => schema.unmarshall(item)),
// 		(_, ...rest) => {
// 			return rest.length ? schema.walk?.(...rest) : schema
// 		}
// 	)

export const variant = <T extends string, O extends ObjectVariantSchema<T>[]>(type: T, options: O) =>
	new Schema<'M', S['INPUT'][], S['OUTPUT'][], ArrayPaths<S>, ArrayOptPaths<S>>(
		'M',
		unmarshalled => ({ M: unmarshalled.map(item => schema.marshall(item) as MarshallInputTypes) }),
		marshalled => marshalled.M.map(item => schema.unmarshall(item)),
		(_, ...rest) => {
			return rest.length ? schema.walk?.(...rest) : schema
		}
	)

define('', {
	hash: 'list',
	schema: object({
		list: array(
			variant('type', [
				object({
					type: string<'bet'>(),
					// bet: number(),
				}),
				object({
					type: string<'message'>(),
					// message: string(),
				}),
			])
		),
	}),
})

type Test<T extends string> = { [K in T]: string } & Record<string, any>

const lol: Test<'lol'> = {
	lol: '1',
	other: true,
}
