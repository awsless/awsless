# @awsless/big-float

A library for arbitrary precision decimal floating point arithmetic that can exactly represent all decimal fractions,
unlike JavaScript's number data type which is 64-bit binary floating point.

This package started out as a fork of `bigfloat-esnext` but with bug fixes and we removed the need for the BigInt polyfill.
We also added tests from the `big.js` package.

# Basic usage
```ts
import { BigFloat, sqrt } from "@awsless/big-float";

sqrt(new BigFloat(2)).toString()      // "1.4142"
```

### Change precision
```ts
import { sqrt, setPrecision } from "@awsless/big-float";

sqrt(2).toString();     // "1.4142"
setPrecision(10);
sqrt(2).toString();     // "1.4142135623"
```

### The bigfloat interface
```ts
interface IBigFloat {
  coefficient: bigint;
  exponent: number;
}
```

### Available API
```ts
import { BigFloat, type IBigFloat, type Numeric, setPrecision } from "@awsless/big-float";

// arithmetic
import { neg, abs, add, sub, mul, div, sqrt, pow, ceil, floor, fact } from '@awsless/big-float'

// retational
export { eq, lt, lte, gt, gte, min, max, clamp, cmp } from '@awsless/big-float'

// predicates
export { isBigFloat, isInteger, isNegative, isPositive, isZero } from '@awsless/big-float'

// constants
export { ZERO, ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, HUNDRED, THOUSAND, MILLION, BILLION, TRILLION } from '@awsless/big-float'
```
