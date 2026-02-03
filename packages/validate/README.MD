# @awsless/validate

The @awsless/validate package exports the valibot API with some additional custom schema's for working with JSON, Duration, BigFloat, and AWS.

## Setup

Install with (NPM):

```
npm i @awsless/validate
```

## Basic Usage

```ts
import { parse, bigfloat } from '@awsless/validate'
import { BigFloat } from '@awsless/big-float'

const input = new BigFloat(100)
const schema = bigfloat()
const output = parse(schema, input)
```
