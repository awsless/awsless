// src/bigfloat.ts
import { make, string, set_precision } from "bigfloat-esnext";
set_precision(-12);
var BigFloat = class {
  exponent;
  coefficient;
  constructor(number) {
    const { exponent, coefficient } = make(number);
    this.exponent = exponent;
    this.coefficient = coefficient;
  }
  toJSON() {
    return this.toString();
  }
  toString(radix) {
    if (typeof radix !== "undefined") {
      radix = make(radix);
    }
    return string(this, radix);
  }
};

// src/arithmetic.ts
import {
  make as make2,
  mul as a_mul,
  div as a_div,
  neg as a_neg,
  sub as a_sub,
  add as a_add,
  abs as a_abs,
  sqrt as a_sqrt,
  ceil as a_ceil,
  floor as a_floor,
  exponentiation as a_exponentiation
} from "bigfloat-esnext";
var neg = (a) => new BigFloat(a_neg(make2(a)));
var abs = (a) => new BigFloat(a_abs(make2(a)));
var add = (a, ...other) => {
  return new BigFloat(other.reduce((prev, current) => {
    return a_add(make2(prev), make2(current));
  }, a));
};
var sub = (a, ...other) => {
  return new BigFloat(other.reduce((prev, current) => {
    return a_sub(make2(prev), make2(current));
  }, a));
};
var mul = (multiplicand, multiplier) => {
  return new BigFloat(a_mul(make2(multiplicand), make2(multiplier)));
};
var div = (dividend, divisor, precision) => {
  return new BigFloat(a_div(make2(dividend), make2(divisor), precision));
};
var sqrt = (a) => new BigFloat(a_sqrt(make2(a)));
var ceil = (a, precision = 0, divisorPrecision) => {
  const divisor = make2(Math.pow(10, precision));
  return new BigFloat(a_div(a_ceil(a_mul(make2(a), divisor)), divisor, divisorPrecision));
};
var floor = (a, precision = 0, divisorPrecision) => {
  const divisor = make2(Math.pow(10, precision));
  return new BigFloat(a_div(a_floor(a_mul(make2(a), divisor)), divisor, divisorPrecision));
};
var pow = (base, exp) => {
  return new BigFloat(a_exponentiation(make2(base), make2(exp)));
};

// src/relational.ts
import {
  make as make3,
  eq as a_eq,
  lt as a_lt,
  lte as a_lte,
  gt as a_gt,
  gte as a_gte
} from "bigfloat-esnext";
var eq = (a, b) => a_eq(make3(a), make3(b));
var lt = (a, b) => a_lt(make3(a), make3(b));
var lte = (a, b) => a_lte(make3(a), make3(b));
var gt = (a, b) => a_gt(make3(a), make3(b));
var gte = (a, b) => a_gte(make3(a), make3(b));

// src/index.ts
import {
  set_precision as set_precision2,
  evaluate,
  scientific,
  fraction,
  is_big_float,
  is_number,
  is_negative,
  is_positive,
  is_zero,
  is_integer
} from "bigfloat-esnext";
export {
  BigFloat,
  abs,
  add,
  ceil,
  div,
  eq,
  evaluate,
  floor,
  fraction,
  gt,
  gte,
  is_big_float,
  is_integer,
  is_negative,
  is_number,
  is_positive,
  is_zero,
  lt,
  lte,
  mul,
  neg,
  pow,
  scientific,
  set_precision2 as set_precision,
  sqrt,
  sub
};
