
import { BigFloat } from "@awsless/big-float"
import { IDGenerator } from "../helper/id-generator"
import { AttributeTypes } from "../structs/struct"
import { AnyTableDefinition } from "../table"
import { InferPath, InferValue } from "../types/infer"

export type UpdateExpression<T extends AnyTableDefinition> = Readonly<{
	/** Define a custom update expression */
	raw: (fn:(
		path:<P extends InferPath<T>>(...path:P) => string,
		value:(value:Record<AttributeTypes, any>) => string
	) => string) => void

	/** Update a given property */
	update: <P extends InferPath<T>>(...path:P) => Update<T, P>
}>

type Update<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{

	/** Set a value */
	set: (value:InferValue<T, P>) => UpdateExpression<T>

	/** Delete a property */
	del: () => UpdateExpression<T>

	/** Increment a numeric value */
	incr: (value?:number | bigint | BigFloat, initialValue?: number | bigint | BigFloat) => UpdateExpression<T>

	/** Decrement a numeric value */
	decr: (value?:number | bigint | BigFloat, initialValue?: number | bigint | BigFloat) => UpdateExpression<T>

	/** Append values to a Set */
	append: (values:InferValue<T, P>) => UpdateExpression<T>

	/** Remove values from a Set */
	remove: (values:InferValue<T, P>) => UpdateExpression<T>

}>

export const updateExpression = <T extends AnyTableDefinition>(
	options:{ update: (exp:UpdateExpression<T>) => void },
	gen:IDGenerator<T>,
) => {
	const sets:string[] = []
	const adds:string[] = []
	const rems:string[] = []
	const dels:string[] = []
	const raws:string[] = []

	const q = <T>(list:string[], v: string, response:T):T => {
		list.push(v)
		return response
	}

	const start = (): UpdateExpression<T> => ({
		update: (...path) => update(path),
		raw: (fn) => {
			raws.push(fn(
				(...path) => gen.path(path),
				(value) => gen.value(value),
			))
		}
	})

	const update = <P extends InferPath<T>>(path:P): Update<T, P> => {
		const n = gen.path(path)
		const v = (value:any) => gen.value(value, path)
		const s = start()

		return {
			set: (value) => q(sets, `${n} = ${v(value)}`, s),
			del: () => q(rems, n, s),
			incr: (value = 1, initialValue = 0) => q(sets, `${n} = ${v(value)} + if_not_exists(${n}, ${v(initialValue)})`, s),
			decr: (value = 1, initialValue = 0) => q(sets, `${n} = ${v(value)} - if_not_exists(${n}, ${v(initialValue)})`, s),
			append: (values) => q(adds, `${n} ${v(values)}`, s),
			remove: (values) => q(dels, `${n} ${v(values)}`, s),
		}
	}

	options.update(start())

	if(raws.length) {
		return raws.join(' ')
	}

	const query:string[] = []

	if(sets.length) query.push(`SET ${sets.join(', ')}`)
	if(rems.length) query.push(`REMOVE ${rems.join(', ')}`)
	if(adds.length) query.push(`ADD ${adds.join(', ')}`)
	if(dels.length) query.push(`DELETE ${dels.join(', ')}`)

	return query.join(' ')
}
