
[![npm version](https://img.shields.io/npm/dw/@awsless/lambda)](https://www.npmjs.org/package/@awsless/lambda)
[![npm version](https://img.shields.io/npm/v/@awsless/lambda.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/lambda)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)


# Basic usage

```ts
import { lambda } from "@awsless/lambda";

// simple echo function
export default lambda({
  handle(event) {
    return event
  }
})
```

```ts
import { lambda } from "@awsless/lambda";
import { object, integer, string, min, max } from "@awsless/validate";
import { bugsnag } from "@awsless/bugsnag";
import { Table, pagination } from "@awsless/dynamodb";

type User = {
  id: number
  name: string
}

const users = new Table<User, 'id'>('users')

export default lambda({

  // Validate the input
  input: object({
    limit: max(min(integer(), 0), 100),
    cursor: string(),
  }),

  // Log errors to bugsnag
  logger: bugsnag(),

  handle({ limit, cursor }) {
    // Return a paginated list of users
    return pagination(table, {
      limit,
      cursor,
    })
  }
})
```

# Invoking a lambda

```ts
import { lambda, invoke } from "@awsless/lambda";
import { string } from "@awsless/validate";

export const echo = lambda({
  input: string(),
  handle(value) {
    return value
  }
})

export default lambda({
  handle() {
    // Providing the type definition of the lambda you want to invoke will give you type hinting for the payload and return value.
    return invoke<typeof echo>({
      name: 'echo',
      payload: 'Hi'
    })
  }
})

```

# Mock invoking lambda's

```ts
import { mockLambda } from "@awsless/lambda";

const lambdas = mockLambda({
  echo: (a) => a,
})

it('your test', async () => {
  const result = await invoke('echo', 'Hi')
  expect(result).toBe('Hi')
  expect(lambdas.echo).toBeCalled()
})

```
