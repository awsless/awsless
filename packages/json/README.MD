
# @awsless/json

The `@awsless/json` package adds support for more JavaScript native types to JSON.

## The Problem

JSON doesn't have support for types like:
- `undefined`
- `Set`
- `Map`
- `Date`
- `BigInt`
- `BigFloat` - npm package @awsless/bit-float

Having to decode & encode these type of values can get quite annoying. We try to solve this problem by encoding these types using valid JSON syntax.

## Basic Usage

```ts
import { parse, stringify } from '@awsless/json';

// Stringify a bigint.
// The output will be {"$bigint":"1"}
const json = stringify(1n)

// Parse the json with a bigint inside.
const value = parse(json)
```

## Patching parsed JSON that was parsed with a different JSON parser

In some cases you might not have control over the JSON parser that is being used. In these cases your JSON will still be able to parse, but the output will be incorrect. We can patch the incorrect output by using the `patch` function.

```ts
import { stringify, patch } from '@awsless/json';

const json = stringify(1n)

// The native JSON.parse function will not parse our bigint correctly.
const broken = JSON.parse(json)

const fixed = patch(broken)
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

## Known Issue's

Object properties with `undefined` as value type will be stripped away.

```ts
// Will result in an empty object
const result = parse(stringify({ key: undefined }))

// Will log false
console.log('key' in result)

// Will log true
console.log(result.key === undefined)
```
