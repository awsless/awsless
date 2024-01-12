[![npm version](https://img.shields.io/npm/dw/@awsless/graphql)](https://www.npmjs.org/package/@awsless/graphql)
[![npm version](https://img.shields.io/npm/v/@awsless/graphql.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/graphql)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)


# Type safe GraphQL query builder

The @awsless/graphql package provides a fully typed graphql client. We generate the types needed for the client to be fully typesafe while still being super lightweight to use.
Compared to other solutions we don't generate big config files that will increase your bundle size.

## Features

- Fully type safe
- Type completion
- Tree shakable API
- Super lightweight
- GQL Unions & Interfaces
- GQL Aliases
- Works in node and the browser

_For features like batching or special authentication you can easily add your own fetcher that supports that._

## Setup

Install with (NPM):

```
npm i @awsless/graphql
```


## Basic Usage

First generate the types needed for the client.

```ts
import { generate } from '@awsless/graphql';
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const schema = readFileSync(join(__dirname, 'schema.gql'), 'utf8')

const output = generate(schema, {
	scalarTypes: {
		AWSDateTime: 'string'
	}
})

writeFileSync(join(__dirname, 'generated.ts'), output)
```

Then you can use your client as follows:

```ts
import { createClient, createFetcher } from '@awsless/graphql';
import type { Schema } from './generated.ts';

const client = createClient<Schema>(
	createFetcher({
		url: 'https://example.com/graphql'
	})
)

client.query({
	countries: {
		name: true,
		code: true
	}
})

```

The code above will result in the graphql query below.

```gql
query {
  countries {
    name
    code
  }
}
```

## Passing arguments

If you want to pass arguments to a query you must use an array where the first object represents the arguments and the second object the fields selection.

```ts
client.mutate({
	addTodo: [{
		// Pass an argument directly in the query.
		title: 'Pick up groceries',

		// Pass an argument as dynamic variable.
		done: $('Boolean', true)
	},{
		id: true
	}]
})

```

```gql
mutation ($v1: Boolean) {
  addTodo(title: "Pick up groceries", done: $v1) {
    id
  }
}
```

## Unions and interfaces

To query some fields only on a certain type you can use graphql unions.

You can express the union and interface types using the "```...on```" prefixed fields in a query.

```ts
const { account } = await client.query({
	account: {
		__typename: true,
		id: true
		'...on User': {
			name: true
		}
		'...on Guest': {
			surname: true
		}
	}
})

// The ID prop will be available without type guards
console.log(account.id)

// You can check the value of __typename to restrict an union type to one of its sub types and let typescript infer its correct fields
if (account.__typename === 'User') {
	// Now account has type User
	console.log(account.name)
}

```

```gql
query {
  account {
	__typename
	id
	...on User {
		name
	}
	...on Guest {
		surname
	}
  }
}
```

## Aliases

```ts
const { account } = await client.query({
	account: {
		'other:name': true
	}
})

// The "name" property is now available via "other"
console.log(account.other)
```

```gql
query {
  account {
    other: name
  }
}
```

## Reuseable fragments

Reuseable fragments can be defined with simple JS objects.

```ts
const getUserFragment = (id:string) => [
	{ id },
	{ id: true, name: true }
] as const

const { account } = await client.query({
	'one:getUser': getUserFragment('1'),
	'two:getUser': getUserFragment('2'),
})
```

```gql
query {
	one: getUser(id: "1") {
		id
		name
	}
	two: getUser(id: "2") {
		id
		name
	}
}
```
