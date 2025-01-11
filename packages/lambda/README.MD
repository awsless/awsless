# TODO
- Rename ViewableError to ExpectedError
- Think of ways to type errors (TypeScript might need to figure this out first.)

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
  schema: object({
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
  schema: string(),
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
  echo: a => a,
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
