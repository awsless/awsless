// type ParseNumber = (value: string) => unknown
type Props = {
	parse: (value: string) => unknown
}

export const safeNumberParse = (json: string, props: Props) => {
	return JSON.parse(
		json,
		// @ts-ignore
		createSafeNumberReviver(props)
	)
}

type Reviver = (
	this: any,
	key: string,
	value: any,
	context: {
		source: string
	}
) => any

export const createSafeNumberReviver = (props: Props): Reviver => {
	return function (_, value, context) {
		if (typeof value === 'number') {
			return props.parse(context.source)
		}

		return value
	}
}
