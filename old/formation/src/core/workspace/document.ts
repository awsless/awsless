export const cloneObject = <T>(document: T, replacer?: any): T => {
	return JSON.parse(JSON.stringify(document, replacer))
}

export const compareDocuments = <T>(left: T, right: T) => {
	// order the object keys so that the comparison works.
	const replacer = (_: unknown, value: unknown) => {
		if (value !== null && value instanceof Object && !Array.isArray(value)) {
			return Object.keys(value)
				.sort()
				.reduce((sorted: Record<string, unknown>, key) => {
					sorted[key] = value[key as keyof typeof value]
					return sorted
				}, {})
		}
		return value
	}

	const l = JSON.stringify(left, replacer)
	const r = JSON.stringify(right, replacer)

	return l === r
}
