// src/bigfloat.ts
import { make as a_make, set_precision, string } from "bigfloat-esnext";
set_precision(-12);
var make = (number) => {
  if (typeof number === "string") {
    const lower = number.toLowerCase();
    if (lower.includes("e")) {
      if (lower.includes("+")) {
        return a_make(lower.replaceAll("+", ""));
      }
      return a_make(lower);
    }
  }
  return a_make(number);
};
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

// src/constructors.ts
import { fraction as a_fraction, integer as a_integer, scientific as a_scientific } from "bigfloat-esnext";
var scientific = (number) => {
  return a_scientific(make(number));
};
var fraction = (number) => {
  return new BigFloat(a_fraction(make(number)));
};
var integer = (number) => {
  return new BigFloat(a_integer(make(number)));
};

// src/arithmetic.ts
import {
  abs as a_abs,
  add as a_add,
  ceil as a_ceil,
  div as a_div,
  eq as a_eq,
  exponentiation as a_exponentiation,
  floor as a_floor,
  lt as a_lt,
  mul as a_mul,
  neg as a_neg,
  sqrt as a_sqrt,
  sub as a_sub
} from "bigfloat-esnext";
var neg = (a) => new BigFloat(a_neg(make(a)));
var abs = (a) => new BigFloat(a_abs(make(a)));
var add = (a, ...other) => {
  return new BigFloat(
    other.reduce((prev, current) => {
      return a_add(make(prev), make(current));
    }, a)
  );
};
var sub = (a, ...other) => {
  return new BigFloat(
    other.reduce((prev, current) => {
      return a_sub(make(prev), make(current));
    }, a)
  );
};
var mul = (multiplicand, ...multipliers) => {
  return new BigFloat(
    multipliers.reduce((prev, current) => {
      return a_mul(make(prev), make(current));
    }, multiplicand)
  );
};
var div = (dividend, divisor, precision) => {
  return new BigFloat(a_div(make(dividend), make(divisor), precision));
};
var sqrt = (a) => new BigFloat(a_sqrt(make(a)));
var ceil = (a, precision = 0, divisorPrecision) => {
  const divisor = make(Math.pow(10, precision));
  return new BigFloat(a_div(a_ceil(a_mul(make(a), divisor)), divisor, divisorPrecision));
};
var floor = (a, precision = 0, divisorPrecision) => {
  const divisor = make(Math.pow(10, precision));
  return new BigFloat(a_div(a_floor(a_mul(make(a), divisor)), divisor, divisorPrecision));
};
var pow = (base, exp) => {
  return new BigFloat(a_exponentiation(make(base), make(exp)));
};
var factor = (number) => {
  const value = make(number);
  const ZERO2 = make(0);
  if (a_lt(value, ZERO2)) {
    const NEG_ONE = make(-1);
    return new BigFloat(a_mul(NEG_ONE, factor(a_mul(value, NEG_ONE))));
  }
  const ONE2 = make(1);
  if (a_eq(value, ZERO2) || a_eq(value, ONE2)) {
    return new BigFloat(ONE2);
  }
  return new BigFloat(a_mul(value, factor(a_sub(value, ONE2))));
};

// src/relational.ts
import { eq as a_eq2, gt as a_gt, gte as a_gte, lt as a_lt2, lte as a_lte } from "bigfloat-esnext";
var eq = (a, b) => a_eq2(make(a), make(b));
var lt = (a, b) => a_lt2(make(a), make(b));
var lte = (a, b) => a_lte(make(a), make(b));
var gt = (a, b) => a_gt(make(a), make(b));
var gte = (a, b) => a_gte(make(a), make(b));
var min = (...values) => {
  return new BigFloat(
    values.reduce((prev, current) => {
      return lt(prev, current) ? prev : current;
    })
  );
};
var max = (...values) => {
  return new BigFloat(
    values.reduce((prev, current) => {
      return gt(prev, current) ? prev : current;
    })
  );
};
var minmax = (number, min2, max2) => {
  if (gt(min2, max2)) {
    throw new TypeError(`min ${min2} bound can't be greater then the max ${max2} bound`);
  }
  return new BigFloat(lt(number, min2) ? min2 : gt(number, max2) ? max2 : number);
};
var cmp = (a, b) => {
  if (gt(a, b)) {
    return 1;
  } else if (lt(a, b)) {
    return -1;
  }
  return 0;
};

// src/predicate.ts
import { is_integer, is_negative, is_positive, is_zero } from "bigfloat-esnext";
var isBigFloat = (number) => {
  return number instanceof BigFloat;
};
var isInteger = (number) => {
  return is_integer(make(number));
};
var isNegative = (number) => {
  return is_negative(make(number));
};
var isPositive = (number) => {
  if (isZero(number)) {
    return false;
  }
  return is_positive(make(number));
};
var isZero = (number) => {
  return is_zero(make(number));
};

// src/index.ts
import { set_precision as set_precision2 } from "bigfloat-esnext";

// src/constants.ts
var ZERO = /* @__PURE__ */ new BigFloat(0);
var ONE = /* @__PURE__ */ new BigFloat(1);
var TWO = /* @__PURE__ */ new BigFloat(2);
var THREE = /* @__PURE__ */ new BigFloat(3);
var FOUR = /* @__PURE__ */ new BigFloat(4);
var FIVE = /* @__PURE__ */ new BigFloat(5);
var SIX = /* @__PURE__ */ new BigFloat(6);
var SEVEN = /* @__PURE__ */ new BigFloat(7);
var EIGHT = /* @__PURE__ */ new BigFloat(8);
var NINE = /* @__PURE__ */ new BigFloat(9);
var TEN = /* @__PURE__ */ new BigFloat(10);
var HUNDRED = /* @__PURE__ */ new BigFloat(100);
var THOUSAND = /* @__PURE__ */ new BigFloat(1e3);
var MILLION = /* @__PURE__ */ new BigFloat(1e6);
var BILLION = /* @__PURE__ */ new BigFloat(1e9);
var TRILLION = /* @__PURE__ */ new BigFloat(1e12);
export {
  BILLION,
  BigFloat,
  EIGHT,
  FIVE,
  FOUR,
  HUNDRED,
  MILLION,
  NINE,
  ONE,
  SEVEN,
  SIX,
  TEN,
  THOUSAND,
  THREE,
  TRILLION,
  TWO,
  ZERO,
  abs,
  add,
  ceil,
  cmp,
  div,
  eq,
  factor,
  floor,
  fraction,
  gt,
  gte,
  integer,
  isBigFloat,
  isInteger,
  isNegative,
  isPositive,
  isZero,
  lt,
  lte,
  max,
  min,
  minmax,
  mul,
  neg,
  pow,
  scientific,
  set_precision2 as set_precision,
  sqrt,
  sub
};
