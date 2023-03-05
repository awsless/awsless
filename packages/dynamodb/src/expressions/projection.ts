import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"

type DeepPick<O, P> = (
	P extends keyof O
		? { [ _ in P ]: O[ P ] }
		:
	P extends [ infer K ]
		? K extends keyof O
		? { [ _ in K ]: O[ K ] }
		: never
		:
	P extends [ infer K, ...infer R ]
		? K extends keyof O
		? { [ _ in K ]: DeepPick<O[K], R> }
		: never
		:
	never
)

type DeepPickList<O, P extends unknown[]> = {
	[ K in keyof P ]: DeepPick<O, P[ K ]>
}[ number ]

type Merge<U> = (
	( U extends any
		? (k: U) => void
		: never
	) extends (( k: infer I ) => void)
		? I
		: never
)

export type ProjectionExpression<T extends AnyTableDefinition> = Array<
	T['schema']['PATHS'] |
	Exclude<T['schema']['PATHS'][number], number>
>

export type ProjectionResponse<
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined
> = (
	P extends ProjectionExpression<T>
	? Merge<DeepPickList<T['schema']['OUTPUT'], P>>
	: T['schema']['OUTPUT']
)

// export type ProjectionResponse<
// 	T extends AnyTableDefinition,
// 	P extends ProjectionExpression<T> | undefined = undefined
// > = (
// 	P extends ProjectionExpression<T>
// 	? 1
// 	: T['schema']['OUTPUT']
// )

export const projectionExpression = <
	T extends AnyTableDefinition,
	P extends ProjectionExpression<T> | undefined = undefined
>(
	options:{ projection?: P },
	gen:IDGenerator<T>,
) => {
	if(options.projection) {
		return options.projection
			.map(path => gen.path(path))
			.join(', ')
	}

	return
}
