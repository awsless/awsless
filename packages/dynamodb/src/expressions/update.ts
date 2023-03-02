
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"
import { InferPath, InferValue } from "../types/infer"

export type Update<T extends AnyTableDefinition> = Readonly<{
	set: <P extends InferPath<T>>(...path:P) => Set<T, P>
	remove: <P extends InferPath<T>>(...path:P) => Update<T>
	add: <P extends InferPath<T>>(...path:P) => Value<T, P>
	delete: <P extends InferPath<T>>(...path: P) => Value<T, P>
}>

type Set<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{
	value: (value:InferValue<T, P>) => Update<T>
	sub: <P2 extends InferPath<T>>(...path:P2) => Setter<T, P2>
	add: <P2 extends InferPath<T>>(...path:P2) => Setter<T, P2>
	listAppend: (value:InferValue<T, P>) => Update<T>
	ifNotExists: (value:InferValue<T, P>) => Update<T>
}>

type Setter<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{
	to: (value:InferValue<T, P>) => Update<T>
	ifNotExists: (value:InferValue<T, P>) => Update<T>
}>

type Value<T extends AnyTableDefinition, P extends InferPath<T>> = Readonly<{
	value: (...values:InferValue<T, P>[]) => Update<T>
}>

export const updateExpression = <T extends AnyTableDefinition>(
	options:{ update: (exp:Update<T>) => void },
	gen:IDGenerator<T>,
) => {
	const sets:string[] = []
	const adds:string[] = []
	const rems:string[] = []
	const dels:string[] = []

	const q = <T>(list:string[], v: string, response:T):T => {
		list.push(v)
		return response
	}

	const update = (): Update<T> => ({
		set: (...path) => set(path),
		remove: (...path) => q(rems, `${gen.path(path)}`, update()),
		add: (...path) => val(path),
		delete: (...path) => val(path),
	})

	const set = <P extends InferPath<T>>(path:P): Set<T, P> => {
		const n = gen.path(path)
		return {
			value: (value) => q(sets, `${n} = ${gen.value(value, path)}`, update()),
			add: (...p2) => setter(p2, `${n} = ${gen.path(p2)} +`),
			sub: (...p2) => setter(p2, `${n} = ${gen.path(p2)} -`),
			listAppend: (value) => q(sets, `${n} = list_append(${n}, ${gen.value(value, path)})`, update()),
			ifNotExists: (value) => q(sets, `${n} = if_not_exists(${n}, ${gen.value(value, path)})`, update()),
		}
	}

	const setter = <P extends InferPath<T>>(path:P, op:string): Setter<T, P> => {
		return {
			to: (value) => q(sets, `${op} ${gen.value(value, path)}`, update()),
			ifNotExists: (value) => q(sets, `${op} if_not_exists(${gen.path(path)}, ${gen.value(value, path)})`, update()),
		}
	}

	const val = <P extends InferPath<T>>(path:P): Value<T, P> => {
		const n = gen.path(path)
		return {
			value: (value) => q(adds, `${n} ${gen.value(value, path)}`, update()),
		}
	}

	options.update(update())

	const query:string[] = []

	if(sets.length) query.push(`SET ${sets.join(', ')}`)
	if(rems.length) query.push(`REMOVE ${rems.join(', ')}`)
	if(adds.length) query.push(`ADD ${adds.join(', ')}`)
	if(dels.length) query.push(`DELETE ${dels.join(', ')}`)

	return query.join(' ')
}
