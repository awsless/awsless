import { ExpressionAttributes } from '../expression/attributes'
import { buildConditionExpression, ConditionExpression } from '../expression/condition'
import { AnyTable } from '../table'
import { PrimaryKey } from '../types/key'
import { transactable } from './command'

export const conditionCheck = <T extends AnyTable>(
	table: T,
	key: PrimaryKey<T>,
	options: {
		when: ConditionExpression<T>
	}
) => {
	const attrs = new ExpressionAttributes(table)
	const input = {
		TableName: table.name,
		Key: table.marshall(key),
		ConditionExpression: buildConditionExpression(attrs, options.when)!,
		...attrs.attributes(),
	}

	return transactable(() => ({
		ConditionCheck: input,
	}))
}
