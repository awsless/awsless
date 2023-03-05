
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition, IndexNames } from "../table"

type PrimaryKeyNames<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined
> = (
	I extends IndexNames<T>
	? T['indexes'][I]['sort'] extends string
		? T['indexes'][I]['hash'] | T['indexes'][I]['sort']
		: T['indexes'][I]['hash']
	: T['sort'] extends string
		? T['hash'] | T['sort']
		: T['hash']
)

// type PrimaryKeyNames<
// 	T extends AnyTableDefinition,
// 	I extends IndexNames<T> | undefined
// > = (
// 	I extends IndexNames<T> ? 'INDEX' : 'NORMAL'
// )

type InferValue<
	T extends AnyTableDefinition,
	P extends PrimaryKeyNames<T, I>,
	I extends IndexNames<T> | undefined
> = T['schema']['INPUT'][P]

export type KeyCondition<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined
> = Readonly<{
	where: <P extends PrimaryKeyNames<T, I>>(path:P) => Where<T, P, I>
}>

type Where<
	T extends AnyTableDefinition,
	P extends PrimaryKeyNames<T, I>,
	I extends IndexNames<T> | undefined
> = Readonly<{
	eq: (value:InferValue<T, P, I>) => Combiner<T, I>
	gt: (value:InferValue<T, P, I>) => Combiner<T, I>
	gte: (value:InferValue<T, P, I>) => Combiner<T, I>
	lt: (value:InferValue<T, P, I>) => Combiner<T, I>
	lte: (value:InferValue<T, P, I>) => Combiner<T, I>
	between: (min: InferValue<T, P, I>, max: InferValue<T, P, I>) => Combiner<T, I>
	beginsWith: (value:InferValue<T, P, I>) => Combiner<T, I>
}>

type Combiner<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined
> = Readonly<{
	and: KeyCondition<T, I>
	or: KeyCondition<T, I>
}>

export const keyConditionExpression = <
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined = undefined
>(
	options:{
		index?: I
		keyCondition: (exp:KeyCondition<T, I>) => void
	},
	gen:IDGenerator<T>,
) => {

	const query:string[] = []
	const q = <T>(v: string, response:T):T => {
		query.push(v)
		return response
	}

	const condition = (): KeyCondition<T, I> => ({
		where: (path) => where(path)
	})

	const where = <P extends PrimaryKeyNames<T, I>>(path:P): Where<T, P, I> => {
		const n = gen.path(path)
		const v = (value:InferValue<T, P, I>) => gen.value(value, [ path ])
		const c = combiner()

		return {
			eq: (value) => q(`(${n} = ${v(value)})`, c),
			gt: (value) => q(`(${n} > ${v(value)})`, c),
			gte: (value) => q(`(${n} >= ${v(value)})`, c),
			lt: (value) => q(`(${n} < ${v(value)})`, c),
			lte: (value) => q(`(${n} <= ${v(value)})`, c),
			between: (min, max) => q(`(${n} BETWEEN ${v(min)} AND ${v(max)})`, c),
			beginsWith: (value) => q(`begins_with(${n}, ${v(value)})`, c),
		}
	}

	const combiner = ():Combiner<T, I> => ({
		get and() { return q(`AND`, condition()) },
		get or() { return q(`OR`, condition()) },
	})

	options.keyCondition(condition())

	return query.join(' ')
}
