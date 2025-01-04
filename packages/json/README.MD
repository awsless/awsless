
# @awsless/json

The `@awsless/json` package adds support for more JavaScript native types to JSON.

## The Problem

JSON doesn't have support for types like:
- Set
- Map
- Date
- BigInt
- BigFloat - npm @awsless/bit-float

Having to decode & encode these type of values can get quite annoying.

## Basic Usage

```ts
import { parse, stringify } from '@awsless/json';

// Stringify a bigint.
// The output will be {"$bigint": "1"}
const json = stringify(1n)

// Parse the json with a bigint inside.
const value = parse(json)
```

## Extending Supported Types

We let you extend JSON to support your own custom types.

```ts
import { parse, stringify, Serializable } from '@awsless/json';

class Custom {
	readonly value

	constructor(value: string) {
		this.value = value
	}
}

const $custom: Serializable<Custom, string> = {
	is: v => v instanceof Custom,
	parse: v => new Custom(v),
	stringify: v => v.value,
}

// Stringify your custom type
const json = stringify(new Custom('example'), { $custom })

// Parse the json with your custom type
const value = parse(json, { $custom })
```
