
# @awsless/dynamodb

The `awsless/dynamodb` package provides a small and tree-shakable layer around aws-sdk v3, to make working with the DynamoDB API super simple.

## The Problem

- __Floating Point Precision__ - Almost no DynamoDB clients are suitable when floating point precision is important. We use our @awsless/big-float package to solve this problem.
- __Tree-shakable__ - The API is designed to balance tree-shakability vs providing a fully typed API.
- __Query Builder__ - Type safe & easy to use query expression builder.
- __Testing__ - We provide a local DynamoDB server and mock that will route all DynamoDB requests to your local DynamoDB server.

## Setup

Install with (NPM):

```
npm i @awsless/dynamodb
```

## Basic Usage

```ts
import { putItem, getItem, define, ... } from '@awsless/dynamodb';

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
		when: e => e.id.notExists()
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
- enum_
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

# Operation Functions

| Type						| Description					|
|---------------------------|-------------------------------|
| `getItem`					| Get an item |
| `putItem`					| Store an item |
| `updateItem`				| Update an item |
| `deleteItem`				| Delete an item |
| `getIndexItem`			| Get an item from a specific index |
| `query`					| Query a list of items |
| `scan`     				| Scan the table for items |
| `getItems`				| Batch get items |
| `putItems`				| Batch store items |
| `deleteItems`				| Batch delete items |
| `transactWrite`			| Execute a transactional write |
| `transactRead`			| Execute a transactional read |

# Typescript Infer

You can infer the item type of your table definition with the `Infer` utility type.

```ts
import { define, Infer, object, uuid, number, string, buffer } from "@awsless/dynamodb";

const posts = define('posts', {
	hash: 'id',
	schema: object({
		id: uuid(),
		title: string(),
		likes: number(),
		data: buffer(),
	})
})

/* {
  id: UUID,
  title: string,
  likes: number,
  data: Buffer
} */
type Post = Infer<typeof posts>
```

## License

MIT
