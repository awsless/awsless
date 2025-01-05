type Props<T> = {
	is: (value: unknown) => value is T
	stringify: (value: T) => string
}

export const safeNumberStringify = <T>(value: unknown, props: Props<T>) => {
	return JSON.stringify(value, createSafeNumberReplacer(props))
}

type Replacer = (this: any, key: string, value: any) => any

export const createSafeNumberReplacer = <T>(props: Props<T>): Replacer => {
	return function (key, value) {
		const original = this[key]

		if (props.is(original)) {
			// @ts-ignore
			return JSON.rawJSON(props.stringify(original))
		}

		return value
	}
}
