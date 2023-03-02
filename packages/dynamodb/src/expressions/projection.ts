import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition } from "../table"

export type ProjectionExpression<T extends AnyTableDefinition> = (
	T['schema']['PATHS'] |
	Exclude<T['schema']['PATHS'][0], number>
)[]

export type ProjectionResponse<T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined> = (
	P extends undefined ? T['schema']['OUTPUT'] : Partial<T['schema']['OUTPUT']>
)

export const projectionExpression = <T extends AnyTableDefinition, P extends ProjectionExpression<T> | undefined>(
	options:{ projection?: P },
	gen:IDGenerator<T>,
) => {
	if(options.projection) {
		return options.projection
			.map(path => gen.path(path))
			.join(', ')
	}

	return
}
