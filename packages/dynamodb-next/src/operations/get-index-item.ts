import { ProjectionExpression, ProjectionResponse } from '../expression/projection.js'
import { AnyTable, IndexNames } from '../table.js'
import { PrimaryKey } from '../types/key.js'
import { Options } from '../types/options.js'
import { thenable } from './command.js'
import { query } from './query.js'

export const getIndexItem = <
	T extends AnyTable,
	I extends IndexNames<T>,
	const P extends ProjectionExpression<T> | undefined = undefined,
>(
	table: T,
	index: I,
	key: PrimaryKey<T, I>,
	options?: Options & {
		select?: P
	}
) => {
	return thenable<ProjectionResponse<T, P> | undefined>(async () => {
		const result = await query(table, key, {
			...options,
			index,
			limit: 1,
			disablePreciseCursor: true,
		})

		return result.items[0]
	})
}
