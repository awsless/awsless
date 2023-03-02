
import { IDGenerator } from "../src/helper/id-generator"
import { array } from "../src/structs/array"
// import { putItem } from "../operations/put-item"
import { number } from "../src/structs/number"
import { object } from "../src/structs/object"
import { optional } from "../src/structs/optional"
import { string } from "../src/structs/string"
import { define } from "../src/table"
import { addConditionExpression } from "../src/expressions/conditions"

const users = define('table-name', {
	hash: 'id',
	sort: 'sort',
	schema: object({
		id:		string(),
		sort:	optional(string()),
		attr:	object({
			inner: number()
		}),
		list: array(object({
			num: number()
		}))
	})
})

// type U = (typeof users.schema)['INPUT']
// const u:U = {}

async () => {
	const gen = new IDGenerator()
	addConditionExpression<typeof users>(
		{},
		{
			condition(expression) {
				expression
					.where('attr')
					.eq({ inner: 1 })
					.and
					.where('id')
					.eq('1')
					.and
					.where('list', 1, 'num')
					.eq(1)
					.and
					.where('id')
					.attributeType('S')
			}
		},
		gen
	)

	// const item = await putItem(users, { id: '1', sort: 1, attr: { inner: '1'} }, {
	// 	return: 'ALL_NEW',
	// 	condition(expression) {
	// 		expression
	// 			.where('id')
	// 			.eq('1')
	// 			.and
	// 			.where('attr')
	// 			.attributeType('S')
	// 			.and
	// 			.where('attr')
	// 	}
	// })
}
