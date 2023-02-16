import { Item } from "./types"
// import { Object } from 'ts-toolbelt'

export class Table<Model extends Item, HashKey extends keyof Model, SortKey extends keyof Model = never> {
	declare model: Model
	declare hashKey: HashKey
	declare sortKey: SortKey
	// declare paths: PathOf<Model>
	declare key: Pick<Model, HashKey | SortKey>

	constructor(readonly name: string) {}

	toString() {
		return this.name
	}
}





// type PathsOf<O, P extends unknown[] = []> = [ K keyof O ]

// type Test = {
// 	num: number
// 	deep: {
// 		str: string
// 	}
// 	array: {item: string}[]
// }

// type PathOf<T> =
//   T extends Record<PropertyKey, unknown> ? readonly [keyof T] | readonly [keyof T, ...PathOf<T[keyof T]>]
//   : T extends readonly unknown[] ? readonly [keyof T, ...PathOf<T[keyof T]>]
//   : readonly []

// type Paths = PathOf<Test>

// const lol:Paths = ['array', 0, 'item']

// lol[0]

// // const lol:Paths = [] as Paths

// // lol[0]

// // type UnionOf<A> =
// //     A extends List
// //     ? A[number]
// //     : A[keyof A]



// // /**
// //  * @hidden
// //  */
// // type _Paths<O, P extends List = []> = UnionOf<{
// //     [K in keyof O]:
// //     O[K] extends BuiltIn | Primitive ? NonNullableFlat<[...P, K?]> :
// //     [Keys<O[K]>] extends [never] ? NonNullableFlat<[...P, K?]> :
// //     12 extends Length<P> ? NonNullableFlat<[...P, K?]> :
// //     _Paths<O[K], [...P, K?]>
// // }>

// // /**
// //  * Get all the possible paths of `O`
// //  * (⚠️ this won't work with circular-refs)
// //  * @param O to be inspected
// //  * @returns [[String]][]
// //  * @example
// //  * ```ts
// //  * ```
// //  */
// // export type Paths<O, P extends List = []> =
// //     _Paths<O, P> extends infer X
// //     ? Cast<X, List<Key>>
// //     : never
