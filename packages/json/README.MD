
# @awsless/json

The `@awsless/json` package adds support for more JavaScript native types to JSON.

Features:
 - Lightweight / Using the JS native JSON parser.
 - JSON backwards compatible.
 - No precision loss.
 - Includes support for basic JS types.
 - Extendable.

## The Problem

JSON doesn't have support for types like:
- `undefined`
- `NaN`
- `Infinity`
- `Uint8Array`
- `RegExp`
- `Set`
- `Map`
- `URL`
- `Date`
- `BigInt`
- `BigFloat` - npm package @awsless/bit-float
- `Duration` - npm package @awsless/duration

Having to encode & decode these type of values can get quite annoying. We try to solve this problem by encoding these types using valid JSON syntax.

Additionally, the native `JSON.parse/stringify` functions do not address the potential loss of precision problem.

## Basic Usage

```ts
import { parse, stringify } from '@awsless/json';

// The output will be {"$bigint":"1"}
const json = stringify(1n)

// Parse the json with a bigint inside.
const value = parse(json)
```

## Patching incorrectly parsed JSON that was parsed with a different JSON parser

In some situations, you may not have control over the JSON parser being used. In these instances, your JSON can still be parsed, but the output may be incorrect. We can correct the inaccurate output by using the `patch` function.

```ts
import { stringify, patch } from '@awsless/json';

const json = stringify(1n)

// The native JSON.parse function will not parse our bigint correctly.
const broken = JSON.parse(json)

// Will fix the broken output.
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

// Stringify your custom type.
const json = stringify(new Custom('example'), { $custom })

// Parse the json with your custom type.
const value = parse(json, { $custom })
```

## Precision Loss

When using the native `JSON.parse/stringify` functions you could lose precision when parsing native numbers. And you don't always have the ability to extend JSON with your own custom types. For example when you’re communicating with a third-party API. For this reason, we have 2 utility functions that will parse the native JSON number type to your own precision-safe alternative.

> [!NOTE]
> These utility functions will only work in environments that support `JSON.rawJSON`
> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/rawJSON#browser_compatibility

```ts
import { safeNumberParse, safeNumberStringify } from '@awsless/json';
import { BigFloat, eq } from '@awsless/big-float';

const value = new BigFloat(1)
const json = safeNumberStringify(ONE, {
	is: v => v instanceof BigFloat,
	stringify: v => v.toString(),
})

console.log(json) // '1'

const result = safeNumberParse('1', {
	parse: v => new BigFloat(v),
})

console.log(eq(value, result)) // true
```

## Known Issue's

### Don't use the `$` character inside your JSON.

We use the `$` character to encode our special types inside JSON. In order to prevent parsing errors we recommend to avoid using the `$` character inside your object property names.
