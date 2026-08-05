
import { ProjectionExpression, ProjectionResponse } from '../expressions/projection.js'
import { AnyTableDefinition, IndexNames } from '../table.js'
import { Options } from '../types/options.js'
import { PrimaryKey } from '../types/key.js'
import { query } from './query.js'

export const getIndexedItem = async <
	T extends AnyTableDefinition,
	I extends IndexNames<T>,
	P extends ProjectionExpression<T> | undefined = undefined
>(
	table: T,
	key: PrimaryKey<T, I>,
	options: Options & {
		index: I,
		projection?: P
	}
): Promise<ProjectionResponse<T, P> | undefined> => {
	const keys: {
		hash: T['indexes'][I]['hash'],
		sort?: T['indexes'][I]['sort']
	} = table.indexes[options.index]

	const result = await query(table, {
		...options,
		limit: 1,
		keyCondition(exp) {
			const query = exp
				.where(keys.hash)
				.eq(key[keys.hash])

			if(!keys.sort) {
				return query
			}

			return query
				.and
				.where(keys.sort)
				.eq(key[keys.sort])
		}
	})

	return result.items[0]
}
