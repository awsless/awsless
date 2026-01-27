# @awsless/dynamodb

The `awsless/dynamodb` package provides a small and tree-shakable layer around aws-sdk v3, to make working with the DynamoDB API super simple.

## The Problem

- **Floating Point Precision** - Almost no DynamoDB clients are suitable when floating point precision is important. We use our @awsless/big-float package to solve this problem.
- **Tree-shakable** - The API is designed to balance tree-shakability vs providing a fully typed API.
- **Query Builder** - Type safe & easy to use query expression builder.
- **Testing** - We provide a local DynamoDB server and mock that will route all DynamoDB requests to your local DynamoDB server.

## Recommended

Make sure to enable `strict` mode inside your tsconfig file, to get the most benafit of the strong typing guarantees that this package has to offer.

## Setup

Install with (NPM):

```
npm i @awsless/dynamodb
```

## Basic Usage

```ts
import { putItem, getItem, define, ... } from '@awsless/dynamodb';

// Define your db schema
const posts = define('posts', {
	hash: 'userId',
	sort: 'id',
	schema: object({
		id: number(),
		userId: number(),
		title: string(),
		comments: optional(array(string()))
	})
})

// Insert a post into the posts table
await putItem(posts, {
	id: 1,
	userId: 1,
	title: 'Hello World',
})

// Get a post from the posts table
const post = await getItem(posts, { userId: 1, id: 1 }, {
	select: [ 'title' ]
})

// Update a post in the posts table
await updateItem(posts, { userId: 1, id: 1 }, {
	update: e => [
		e.title.set('Hi...'),
		e.comments.push('Powerful query builder...'),
	],
	when: e => [
		e.size(e.comments).eq(0)
	]
})

// Delete a post in the posts table
await deleteItem(posts, { userId: 1, id: 1 })

// List posts from user 1
const { items, cursor } = await query(posts, { userId: 1 })

// List all posts from user 1
for await(const items of query(posts, { userId: 1 }, { limit: 100 })) {
	// Processing batches of 100 items at a time...
	...
}

// List posts
const { items, cursor } = await scan(posts)

// List all posts
for await(const items of scan(posts, { limit: 100 })) {
	// Processing batches of 100 items at a time...
	...
}

// Write transaction
await transactWrite([
	conditionCheck(posts, { userId: 1, id: 0 }, {
		when: e => [
			e.id.notExists(),
			e.size(e.comments.at(0)).gt(0)
		]
	}),

	putItem(posts, { userId: 1, id: 1, title: 'Post 1' }),
	putItem(posts, { userId: 1, id: 2, title: 'Post 2' }),
	putItem(posts, { userId: 1, id: 3, title: 'Post 3' }),
])

// Read transaction
const items = await transactRead([
	getItem(posts, { userId: 1, id: 1 }),
	getItem(posts, { userId: 1, id: 2 }),
	getItem(posts, { userId: 1, id: 3 }),
])

// Batch put items
await putItems(posts, [
	{ userId: 1, id: 0, title: 'Post 1' },
	{ userId: 1, id: 1, title: 'Post 2' },
	{ userId: 1, id: 2, title: 'Post 3' }
])

// Batch get items
const items = await getItems(posts, [
	{ userId: 1, id: 0 },
	{ userId: 1, id: 1 },
	{ userId: 1, id: 2 }
])

// Batch delete items
await deleteItems(posts, [
	{ userId: 1, id: 0 },
	{ userId: 1, id: 1 },
	{ userId: 1, id: 2 }
])
```

# Local Development / Testing

```ts
import { mockDynamoDB, seedTable, ... } from "@awsless/dynamodb";

const posts = define('posts', {
	hash: 'id',
	schema: object({
		id: number(),
		title: string(),
	})
})

mockDynamoDB({
	tables: [ posts ],
	seeds: [
		seedTable(posts, [{
			id: 1,
			title: 'Hello World',
		}])
	]
})

it('your test', async () => {
	const result = await getItem(posts, { id: 1 })

	expect(result).toStrictEqual({
		id: 1,
		title: 'Hello World',
	})
})
```

# Schema Types

We provides the following schema types:

- any
- array
- bigfloat
- bigint
- boolean
- buffer
- date
- enum\_
- json
- number
- object
- optional
- record
- set
- string
- ttl
- tuple
- uint8array
- unknown
- uuid
- variant

### `set` Schema Type

DynamoDB has a limitation where a empty `set` can't be stored.
Instead the empty `set` attribute will be removed.
But with this limitation it's not possible to differentiate between a empty `set` and a undefined attribute.
In order to overcome this limitation we store a `set` differently.
Examples of the data structure:

- Undefined set:
  `undefined`
- Empty set:
  `{ M: {} }`
- Set with items:
  `{ M: { __SET__: { SS: ['item'] } } }`

### `variant` Schema Type

When using variant types, we can't reliably reference the child properties of a specific variant in an update or condition expression. As a workaround, you could represent your variant's as optional object branches inside a single item shape:

```ts
object({
	type1: optional(object({ ... })),
	type2: optional(object({ ... })),
	type3: optional(object({ ... })),
})
```

# Operation Functions

| Type            | Description                       |
| --------------- | --------------------------------- |
| `getItem`       | Get an item                       |
| `putItem`       | Store an item                     |
| `updateItem`    | Update an item                    |
| `deleteItem`    | Delete an item                    |
| `getIndexItem`  | Get an item from a specific index |
| `query`         | Query a list of items             |
| `scan`          | Scan the table for items          |
| `getItems`      | Batch get items                   |
| `putItems`      | Batch store items                 |
| `deleteItems`   | Batch delete items                |
| `transactWrite` | Execute a transactional write     |
| `transactRead`  | Execute a transactional read      |

# Typescript Infer

You can infer the item type of your table definition with the `Infer` utility type.

```ts
import { define, type Infer, object, uuid, number, string, buffer } from '@awsless/dynamodb'

const posts = define('posts', {
	hash: 'id',
	schema: object({
		id: uuid(),
		title: string(),
		likes: number(),
		data: buffer(),
	}),
})

/* {
  id: UUID,
  title: string,
  likes: number,
  data: Buffer
} */
type Post = Infer<typeof posts>
```

# Update Expression Builder

When updating an item you have to pass in a `update` function property.
This function should return a single or list of update operations.
The function will receive an expression builder that should be used to express the update operation.

Example:

```ts
await updateItem(
	posts,
	{ userId: 1, id: 1 },
	{
		update: e => [
			// Update the title attribute.
			e.title.set('Hi...'),

			// Push a new comment onto the comments array attribute.
			e.comments.push('Powerful query builder...'),
		],
	}
)
```

## Available Update Operations

| Type             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `set`            | Set the attribute to the provided value.                    |
| `setPartial`     | Partially update the object fields with the provided value. |
| `setIfNotExists` | Set the attribute value only if it does not already exist.  |
| `delete`         | Delete an attribute.                                        |
| `push`           | Push one or more elements to the end of the array.          |
| `incr`           | Increment a numeric value.                                  |
| `decr`           | Decrement a numeric value.                                  |
| `append`         | Append elements to a Set.                                   |
| `remove`         | Remove elements from a Set.                                 |

# Condition Expression Builder

...

```ts
await putItem(
	posts,
	{ id: 1, ... },
	{
		when: e => [
			// check if post doesn't exists.
			e.id.notExists()
		],
	}
)
```

## Available Condition Checks

| Type         | Description                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------- |
| `eq`         | Check if the attribute is equal to the specified value or another attribute.                 |
| `nq`         | Check if the attribute is not equal to the specified value or another attribute.             |
| `lt`         | Check if the attribute is less than the specified value or another attribute.                |
| `lte`        | Check if the attribute is less than or equal to the specified value or another attribute.    |
| `gt`         | Check if the attribute is greater than the specified value or another attribute.             |
| `gte`        | Check if the attribute is greater than or equal to the specified value or another attribute. |
| `between`    | Check if the attribute is between two values, inclusive.                                     |
| `in`         | Check if the attribute is equal to any value in the specified list.                          |
| `contains`   | Check if the attribute contains the specified value.                                         |
| `startsWith` | Check if the attribute begins with the specified substring or attribute value.               |
| `exists`     | Check if the attribute exists.                                                               |
| `notExists`  | Check if the attribute does not exist.                                                       |
| `type`       | Check if the attribute is of the specified DynamoDB type.                                    |

## Special Global Functions

| Type   | Description                                                       |
| ------ | ----------------------------------------------------------------- |
| `and`  | Check if all inner conditions evaluate to `true`.                 |
| `or`   | Check if at least one inner condition evaluates to `true`.        |
| `not`  | Check if the given condition evaluates to `false`.                |
| `size` | Evaluates the size (length or item count) of the given attribute. |

## License

MIT
