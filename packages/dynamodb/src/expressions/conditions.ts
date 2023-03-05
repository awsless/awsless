
import { IDGenerator } from "../helper/id-generator"
import { AttributeTypes } from "../structs/struct"
import { AnyTableDefinition } from "../table"
import { InferPath, InferValue } from "../types/infer"

type InferSetType<T extends AnyTableDefinition, P extends InferPath<T>> = (
	Parameters<InferValue<T, P>['add']>[0]
)

export type Condition<T extends AnyTableDefinition> = Readonly<{
	where: <P extends InferPath<T>>(...path:P) => Where<T, P>
}>

type Where<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{
	not: Where<T, P>

	eq: (value:InferValue<T, P>) => Combiner<T>
	nq: (value:InferValue<T, P>) => Combiner<T>
	gt: (value:InferValue<T, P>) => Combiner<T>
	gte: (value:InferValue<T, P>) => Combiner<T>
	lt: (value:InferValue<T, P>) => Combiner<T>
	lte: (value:InferValue<T, P>) => Combiner<T>
	between: (min: InferValue<T, P>, max: InferValue<T, P>) => Combiner<T>

	in: (values: InferValue<T, P>[]) => Combiner<T>

	exists: Combiner<T>
	// attributeNotExists: Combiner<T>

	attributeType: (value: AttributeTypes) => Combiner<T>
	beginsWith: (value:InferValue<T, P>) => Combiner<T>

	contains: (value:InferSetType<T, P>) => Combiner<T>
	size: Size<T>
}>

type Size<T extends AnyTableDefinition> = Readonly<{
	eq: (value:number | bigint) => Combiner<T>
	nq: (value:number | bigint) => Combiner<T>
	gt: (value:number | bigint) => Combiner<T>
	gte: (value:number | bigint) => Combiner<T>
	lt: (value:number | bigint) => Combiner<T>
	lte: (value:number | bigint) => Combiner<T>
	between: (min: number | bigint, max: number | bigint) => Combiner<T>
}>

type Combiner<T extends AnyTableDefinition> = Readonly<{
	and: Condition<T>
	or: Condition<T>
}>

export const conditionExpression = <T extends AnyTableDefinition>(
	options:{ condition?: (exp:Condition<T>) => void },
	gen:IDGenerator<T>,
) => {
	if(options.condition) {
		const query:string[] = []
		const q = <T>(v: string, response:T):T => {
			query.push(v)
			return response
		}

		const condition = (): Condition<T> => ({
			where: (...path) => where(path)
		})

		const where = <P extends InferPath<T>>(path:P): Where<T, P> => {
			const n = gen.path(path)
			const v = (value:InferValue<T, P>) => gen.value(value, path)
			const c = combiner()

			return {
				get not() { return q(`NOT`, where(path)) },
				eq: (value) => q(`(${n} = ${v(value)})`, c),
				nq: (value) => q(`(${n} <> ${v(value)})`, c),
				gt: (value) => q(`(${n} > ${v(value)})`, c),
				gte: (value) => q(`(${n} >= ${v(value)})`, c),
				lt: (value) => q(`(${n} < ${v(value)})`, c),
				lte: (value) => q(`(${n} <= ${v(value)})`, c),
				between: (min, max) => q(`(${n} BETWEEN ${v(min)} AND ${v(max)})`, c),
				in:	(values) => q(`(${n} IN (${values.map(value => v(value)).join(', ')})`, c),
				get exists() { return q(`attribute_exists(${n})`, c) },
				// get attributeNotExists() { return q(`attribute_not_exists(${n})`, c) },
				attributeType: (value) => q(`attribute_type(${n}, ${gen.value({ S: value })})`, c),
				beginsWith: (value) => q(`begins_with(${n}, ${v(value)})`, c),
				contains: (value) => q(`contains(${n}, ${gen.value(value as InferValue<T, P>, [ ...path, 0 ])})`, c),
				get size() { return size(n, c) }
			}
		}

		const size = (n:string, c:Combiner<T>): Size<T> => {
			const v = (value:number | bigint) => gen.value({ N: String(value) })
			return {
				eq: (value) => q(`(size(${n}) = ${v(value)})`, c),
				nq: (value) => q(`(size(${n}) <> ${v(value)})`, c),
				gt: (value) => q(`(size(${n}) > ${v(value)})`, c),
				gte: (value) => q(`(size(${n}) >= ${v(value)})`, c),
				lt: (value) => q(`(size(${n}) < ${v(value)})`, c),
				lte: (value) => q(`(size(${n}) <= ${v(value)})`, c),
				between: (min, max) => q(`(size(${n}) BETWEEN ${v(min)} AND ${v(max)})`, c),
			}
		}

		const combiner = ():Combiner<T> => ({
			get and() { return q(`AND`, condition()) },
			get or() { return q(`OR`, condition()) },
		})

		options.condition(condition())

		return query.join(' ')
	}

	return
}
