import { putItem } from "../src/operations/put-item"
import { number, object, string } from "./__schema"
import { define } from "../src/table"

const users = define('table-name', {
	hash: 'id',
	sort: 'sort',
	schema: {
		id:		string(),
		sort:	number(),
		attr:	object({
			inner: string()
		}),
	}
})

async () => {
	const item = await putItem(users, { id: '1', sort: 1, attr: { inner: '1'} }, {
		return: 'ALL_NEW',
		condition(expression) {
			expression
				.where('id')
				.eq('1')
				.and
				.where('attr')
				.attributeType('S')
				.and
				.where('attr')
		}
	})
}

// type NestedArrayKey<O extends unknown[]> = {
// 	[K in Extract<keyof O, number>]: O[K] extends unknown[]
// 	? [ K ] | [ K, ...NestedArrayKey<O[K]> ]
// 	: O[K] extends Record<string, unknown>
// 	? [ K ] | [ K, ...NestedObjectKey<O[K]> ]
// 	: [ K ]
// }[ Extract<keyof O, number> ]

// type NestedObjectKey<O extends Record<string, unknown>> = {
// 	[K in Extract<keyof O, string>]: O[K] extends unknown[]
// 	? [ K ] | [ K, ...NestedArrayKey<O[K]> ]
// 	: O[K] extends Record<string, unknown>
// 	? [ K ] | [ K, ...NestedObjectKey<O[K]> ]
// 	: [ K ]
// }[ Extract<keyof O, string> ]


// type User = {
// 	id: string
// 	list: {
// 		lol: string
// 	}
// }

// type BaseSchema = Record<string, string | BaseSchema>

// type Path<Schema extends BaseSchema> = NestedObjectKey<Schema>

// type UserP = Path<User>
