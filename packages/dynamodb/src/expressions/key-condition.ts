
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"
import { InferPath, InferValue } from "../types/infer"

export type KeyCondition<T extends AnyTableDefinition> = Readonly<{
	where: <P extends InferPath<T>>(...path:P) => Where<T, P>
}>

type Where<T extends AnyTableDefinition, P extends T['schema']['PATHS']> = Readonly<{
	eq: (value:InferValue<T, P>) => Combiner<T>
	gt: (value:InferValue<T, P>) => Combiner<T>
	gte: (value:InferValue<T, P>) => Combiner<T>
	lt: (value:InferValue<T, P>) => Combiner<T>
	lte: (value:InferValue<T, P>) => Combiner<T>
	between: (min: InferValue<T, P>, max: InferValue<T, P>) => Combiner<T>
	beginsWith: (value:InferValue<T, P>) => Combiner<T>
}>

type Combiner<T extends AnyTableDefinition> = Readonly<{
	and: KeyCondition<T>
	or: KeyCondition<T>
}>

export const keyConditionExpression = <T extends AnyTableDefinition>(
	options:{ keyCondition: (exp:KeyCondition<T>) => void },
	gen:IDGenerator<T>,
) => {

	const query:string[] = []
	const q = <T>(v: string, response:T):T => {
		query.push(v)
		return response
	}

	const condition = (): KeyCondition<T> => ({
		where: (...path) => where(path)
	})

	const where = <P extends InferPath<T>>(path:P): Where<T, P> => {
		const n = gen.path(path)
		const v = (value:InferValue<T, P>) => gen.value(value, path)
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

	const combiner = ():Combiner<T> => ({
		get and() { return q(`AND`, condition()) },
		get or() { return q(`OR`, condition()) },
	})

	options.keyCondition(condition())

	return query.join(' ')
}
