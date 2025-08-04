
# @awsless/dynamodb

The `awsless/dynamodb` package provides a small and tree-shakable layer around aws-sdk v3, to make working with the DynamoDB API super simple.

## The Problem

- __Floating Point Precision__ - Almost no DynamoDB clients are suitable when floating point precision is important. We use our @awsless/big-float package to solve this problem.
- __Tree-shakable__ - The API is designed to balance tree-shakability vs providing a fully typed API.
- __Query Builder__ - Type safe & easy to use query expression builder.
- __Testing__ - We provide a local DynamoDB server and mock that will route all DynamoDB requests to the local DynamoDB server.

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
	})
})

// Insert a post into the posts table
await putItem(posts, {
	id: 1,
	userId: 1,
	title: 'Hello World'
})

// Get a post from the posts table
const user = await getItem(posts, { userId: 1, id: 1 })

// Update a post in the posts table
await updateItem(posts, { userId: 1, id: 1 }, {
	update(exp) {
		return exp.update('title').set('Hi...')
	}
})

// Delete a post in the posts table
await deleteItem(posts, { userId: 1, id: 1 })

// List posts from user 1
const { items, cursor } = await query(posts, {
	keyCondition(exp) {
		return exp.where('userId').eq(1)
	}
})

// List posts from user 1 but with stringified cursors
const { items, cursor } = await paginateQuery(posts, {
	keyCondition(exp) {
		return exp.where('userId').eq(1)
	}
})

// List posts
const { items, cursor } = await scan(posts)

// List all posts
for await(const items of scanAll(posts, { batch: 100 })) {
	// Processing batches of 100 items at a time...
	...
}

// Write a transaction
await transactWrite({
	items: [
		transactConditionCheck(posts, { userId: 1, id: 0 }, {
			condition(exp) {
        		return exp.where('id').not.exists
        	}
		}),

		transactPut(posts, { userId: 1, id: 1, title: 'Post 1' }),
		transactPut(posts, { userId: 1, id: 2, title: 'Post 2' }),
		transactPut(posts, { userId: 1, id: 3, title: 'Post 3' }),
	]
})
```

# Mock for testing

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
- binary
- boolean
- date
- enums
- json
- number
- object
- optional
- record
- set
- string
- ttl
- tuple
- unknown
- uuid

The `binary` schema type supports the following input value types:

`ArrayBuffer, Blob, Buffer, DataView, File, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array`

And the output value type is always `Uint8Array`.

# Operation Functions

| Type						| Description					|
|---------------------------|-------------------------------|
| `getItem`					| Get an item |
| `putItem`					| Store an item |
| `updateItem`				| Update an item |
| `deleteItem`				| Delete an item |
| `getIndexedItem`			| Get an item from a specific index |
| `query`					| Query a list of items |
| `queryAll`				| Query a list of items |
| `paginateQuery`			| Pagination helper to query a list of items |
| `scan`     				| Scan the table for items |
| `scanAll`     			| Scan the table for items |
| `paginateScan`			| Pagination helper to scan a list of items |
| `batchGetItem`			| Batch get items |
| `batchPutItem`			| Batch store items |
| `batchDeleteItem`			| Batch delete items |
| `transactWrite`			| Execute a transactional write |
| `transactPut`				| Store an item transactionally |
| `transactUpdate`			| Update an item transactionally |
| `transactDelete`			| Delete an item transactionally |
| `transactConditionCheck`	| Conditional check transactionally |

# Typescript Infer Types

## `Input<T>`

Infer the item type of a table definition when inserting an item.

## `Output<T>`

Infer the item type of a table definition when querying an item.

```ts
import { define, Input, Output, object, uuid, number, string, binary } from "@awsless/dynamodb";

const posts = define('posts', {
	hash: 'id',
	schema: object({
		id: uuid(),
		title: string(),
		likes: number(),
		data: binary(),
	})
})

/* {
  id: UUID,
  title: string,
  likes: number,
  data: BinaryValue
} */
type Post1 = Input<typeof posts>

/* {
  id: UUID,
  title: string,
  likes: number,
  data: Uint8Array
} */
type Post2 = Output<typeof posts>
```

## License

MIT
