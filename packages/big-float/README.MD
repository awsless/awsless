
[![npm version](https://img.shields.io/npm/dw/@awsless/big-float)](https://www.npmjs.org/package/@awsless/big-float)
[![npm version](https://img.shields.io/npm/v/@awsless/big-float.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/big-float)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

A library for arbitrary precision decimal floating point arithmetic that can exactly represent all decimal fractions,
unlike JavaScript's number data type which is 64-bit binary floating point.

We are wrapping ```bigfloat-esnext``` behind the scenes.

# Basic usage
```ts
import { BigFloat, sqrt } from "@awsless/big-float";

sqrt(new BigFloat(2)).toString()      // "1.4142"
```

### Change precision
```ts
import { sqrt, set_precision } from "@awsless/big-float";

sqrt(2).toString();     // "1.4142"
set_precision(-10);
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
import { BigFloat, set_precision } from "@awsless/big-float";

// arithmetic
import { neg, abs, add, sub, mul, div, sqrt, pow, ceil, floor } from '@awsless/big-float'

// retational
export { eq, lt, lte, gt, gte } from '@awsless/big-float'
```
