import chunk from 'chunk'
import { ProjectionExpression, ProjectionResponse } from '../expression/projection.js'
import { AnyTable, IndexNames } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { Thenable, thenable } from './command.js'
import { query } from './query.js'

type BatchGetIndexOptions<T extends AnyTable, P extends ProjectionExpression<T> | undefined, F extends boolean> = Options & {
	select?: P
	filterNonExistentItems?: F
}

type BatchGetIndexItem = {
	<T extends AnyTable, I extends IndexNames<T>, P extends ProjectionExpression<T> | undefined>(
		table: T,
		index: I,
		keys: PrimaryKey<T, I>[],
		options?: BatchGetIndexOptions<T, P, false>
	): Thenable<(ProjectionResponse<T, P> | undefined)[]>

	<T extends AnyTable, I extends IndexNames<T>, P extends ProjectionExpression<T> | undefined>(
		table: T,
		index: I,
		keys: PrimaryKey<T, I>[],
		options?: BatchGetIndexOptions<T, P, true>
	): Thenable<ProjectionResponse<T, P>[]>
}

export const getIndexItems: BatchGetIndexItem = <
	T extends AnyTable,
	I extends IndexNames<T>,
	const P extends ProjectionExpression<T> | undefined = undefined,
>(
	table: T,
	index: I,
	keys: PrimaryKey<T, I>[],
	options: BatchGetIndexOptions<T, P, boolean> = { filterNonExistentItems: false }
) => {
	return thenable<(ProjectionResponse<T, P> | undefined)[]>(async () => {
		const { filterNonExistentItems = false, ...queryOptions } = options

		let response: (ProjectionResponse<T, P> | undefined)[] = []

		for (const group of chunk(keys, 25)) {
			const results = await Promise.all(
				group.map(async key => {
					const result = await query(table, key, {
						...(queryOptions as Options),
						index,
						limit: 1,
						disablePreciseCursor: true,
					})

					return result.items[0]
				})
			)

			response = [...response, ...results]
		}

		if (filterNonExistentItems) {
			return response.filter((item): item is ProjectionResponse<T, P> => item !== undefined)
		}

		return response
	})
}

