[![npm version](https://img.shields.io/npm/dw/@awsless/dynamodb)](https://www.npmjs.org/package/@awsless/dynamodb)
[![npm version](https://img.shields.io/npm/v/@awsless/dynamodb.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/dynamodb)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

# @awsless/dynamodb

The @awsless/dynamodb package provides a small and tree-shakable layer around aws-sdk v3, to make working with the DynamoDB API super simple.


## Setup

Install with (NPM):

```
npm i @awsless/dynamodb
```


## Basic Usage

```ts
import { putItem, getItem, ql, Table, ... } from '@awsless/dynamodb';

type Post = {
	id: number
	userId: number
	title: string
}

const posts = new Table<Post, 'userId' | 'id'>('posts')

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
	update: ql`SET #title = ${ 'Hi...' }`
})

// Delete a post in the posts table
await deleteItem(posts, { userId: 1, id: 1 })

// List posts from user 1
const { items, cursor } = await query(posts, {
	keyCondition: ql`#userId = ${1}`
})

// List posts from user 1 but with stringified cursors
const { items, cursor } = await pagination(posts, {
	keyCondition: ql`#userId = ${1}`
})

// List all posts
const { items, cursor } = await scan(posts)

// Write a transaction
await transactWrite({
	items: [
		transactConditionCheck(posts, { userId: 1, id: 0 }, {
			condition: ql`attribute_not_exists(#id)`
		}),

		transactPut(posts, { userId: 1, id: 1, title: 'Post 1' }),
		transactPut(posts, { userId: 1, id: 2, title: 'Post 2' }),
		transactPut(posts, { userId: 1, id: 3, title: 'Post 3' }),
	]
})
```

## License

MIT
