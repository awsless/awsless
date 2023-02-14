
export const string = (path: string) => {
	return path
}

export const float = (path: string) => {
	return {
		path,
		transform(value: string) {
			return parseFloat(value)
		}
	}
}

export const integer = (path: string, radix = 10) => {
	return {
		path,
		transform(value: string) {
			return parseInt(value, radix)
		}
	}
}

export const json = <T = unknown>(path: string) => {
	return {
		path,
		transform(value: string): T {
			return JSON.parse(value) as T
		}
	}
}

export const array = <T = string>(path: string, seperator = ',') => {
	return {
		path,
		transform(value: string) {
			return value.split(seperator).map(v => v.trim()) as T[]
		}
	}
}
