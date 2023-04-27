
[![npm version](https://img.shields.io/npm/dw/@awsless/lambda)](https://www.npmjs.org/package/@awsless/lambda)
[![npm version](https://img.shields.io/npm/v/@awsless/lambda.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/lambda)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

# TODO
- Rename ViewableError to ExpectedError

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
import { object, string } from "@awsless/validate";
import { bugsnag } from "@awsless/bugsnag";

export default lambda({

  // Validate the input
  input: object({
    message: string()
  }),

  // Log errors to bugsnag
  logger: bugsnag(),

  handle({ message }) {
    return message
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
  const result = await invoke({
    name: 'echo',
    payload: 'Hi'
  })
  expect(result).toBe('Hi')
  expect(lambdas.echo).toBeCalled()
})

```
