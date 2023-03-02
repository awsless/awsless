import { IDGenerator } from "../types"

export const projectionExpression = (projections:string[], names:IDGenerator) => {
	return projections.map(path => {
		if(Array.isArray(path)) {
			return path.map((name, index) => {
				if(typeof name === 'string') {
					return `${ index === 0 ? '' : '.' }${ names(name) }`
				}

				return `[${name}]`
			}).join('')
		}

		return names(path)
	}).join(', ')
}
