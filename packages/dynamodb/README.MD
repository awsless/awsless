[![npm version](https://img.shields.io/npm/dw/@awsless/dynamodb)](https://www.npmjs.org/package/@awsless/dynamodb)
[![npm version](https://img.shields.io/npm/v/@awsless/dynamodb.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/dynamodb)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

# @awsless/dynamodb

The @awsless/dynamodb package provides a small and tree-shakable layer around aws-sdk v3, to make working with the DynamoDB API super simple.

## The Problem

- Floating Point Precision - Almost no DynamoDB clients are suitable when floating point precision is important. We use our @awsless/big-float package to solve this problem.
- Tree-shakable - The API is designed to balance tree-shakability vs providing a fully typed API.
- Testing - We provide a local DynamoDB server and mock that will route all DynamoDB requests to the local DynamoDB server.

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
		exp.update('title').set('Hi...')
	}
})

// Delete a post in the posts table
await deleteItem(posts, { userId: 1, id: 1 })

// List posts from user 1
const { items, cursor } = await query(posts, {
	keyCondition(exp) {
		exp.where('userId').eq(1)
	}
})

// List posts from user 1 but with stringified cursors
const { items, cursor } = await pagination(posts, {
	keyCondition(exp) {
		exp.where('userId').eq(1)
	}
})

// List all posts
const { items, cursor } = await scan(posts)

// Write a transaction
await transactWrite({
	items: [
		transactConditionCheck(posts, { userId: 1, id: 0 }, {
			condition(exp) {
        		exp.where('id').not.exists
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
import { mockLambda, ... } from "@awsless/dynamodb";

const posts = define('posts', {
	hash: 'id',
	schema: object({
		id: number(),
		title: string(),
	})
})

mockDynamoDB({
  tables: [ posts ]
})

it('your test', async () => {
	await putItem(posts, {
		id: 1,
		title: 'Hello World',
	})
})

```

## License

MIT
