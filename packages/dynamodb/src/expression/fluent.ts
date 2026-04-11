const secret = Symbol('fluent')

export class Fluent extends Function {
	declare readonly [secret]: any[]
}

export const createFluent = () => {
	const createProxy = (list: any[]): any => {
		return new Proxy(new Fluent(), {
			apply(_, __, keys: any[]) {
				return createProxy([...list, keys])
			},
			get(_: any, key: string | symbol) {
				if (key === secret) {
					return list
				}

				if (key === 'toString') {
					return () => `Fluent`
				}

				if (typeof key === 'symbol') {
					return
				}

				// Filter out 'at'
				if (key === 'at') {
					return createProxy(list)
				}

				return createProxy([...list, key])
			},
		})
	}

	return createProxy([])
}

export const getFluentData = (prop: Fluent) => {
	return prop[secret]
}

type FluentExpression = {
	path: Array<string | number>
	op: string
	value: any[]
}

export const getFluentExpression = (prop: Fluent): FluentExpression => {
	const list = getFluentData(prop)
	const length = list.length

	return {
		path: list.slice(0, -2).flat(),
		op: list[length - 2],
		value: list[length - 1],
	}
}

export const getFluentPath = (prop: Fluent) => {
	return getFluentData(prop).flat()
}
