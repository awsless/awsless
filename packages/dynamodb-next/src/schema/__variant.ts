import { putItem } from '../operation/put-item'
import { define } from '../table'
import { array } from './array'
import { number } from './number'
import { object } from './object'
import { AnySchema, Schema } from './schema'
import { string } from './string'

type ObjectVariantSchema<T extends string> = Schema<
	//
	'M',
	Record<string, any> & { [K in T]?: never },
	Record<string, any> & { [K in T]?: never },
	// Record<string, any>,
	// Record<string, any>,
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

// type Variant<T extends string, O extends Record<string, ObjectVariantSchema<T>> = {
// 	[K in T]: (keyof O)[K]
// } & {
// 	[K in keyof O]: {
// 		O[K]
// 	}
// }

type Options<T extends string> = Record<
	string,
	//
	Record<string, AnySchema> & { [K in T]?: never }
>

export const variant = <T extends string, O extends Options<T>>(type: T, options: O) =>
	new Schema<
		'M',
		InferInput<O[keyof O]> & { [K in T]: keyof O },
		InferOutput<O[keyof O]> & { [K in T]: keyof O },
		[],
		[]
	>(
		'M',
		unmarshalled => {
			const key = unmarshalled[type]
			if (typeof key !== 'string') {
				throw new Error()
			}

			const props = options[key]
			if (typeof props === 'undefined') {
				throw new Error()
			}

			const marshalled: Record<string, any> = {
				[type]: { S: key },
			}

			for (const [key, schema] of Object.entries(props)) {
				const value = unmarshalled[key]

				if (schema.filterIn(value)) {
					continue
				}

				marshalled[key] = schema.marshall(value)
			}

			return { M: marshalled }
		},
		marshalled => {
			const key = marshalled.M[type]
			if (typeof key !== 'string') {
				throw new Error()
			}

			const schema = options[key]
			if (typeof schema === 'undefined') {
				throw new Error()
			}

			return schema.unmarshall(marshalled)
		},
		() => {
			return
		}
	)

const table = define('', {
	hash: 'list',
	schema: object({
		list: array(
			variant('type', {
				bet: {
					bet: number(),
				},
				message: {
					// type: string<'message'>(),
					message: string(),
				},
			})
		),
	}),
})

// {
// 	type: 'bet',
// 	bet: number
// }

type Test<T extends string> = { [K in T]?: never } & Record<string, any>

const lol: Test<'lol'> = {
	// lol: '1',
	other: true,
}

putItem(table, {
	list: [
		{
			type: 'bet',
			type: 'message',
		},
	],
})
