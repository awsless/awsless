"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BILLION: () => BILLION,
  BigFloat: () => BigFloat,
  EIGHT: () => EIGHT,
  FIVE: () => FIVE,
  FOUR: () => FOUR,
  HUNDRED: () => HUNDRED,
  MILLION: () => MILLION,
  NINE: () => NINE,
  ONE: () => ONE,
  SEVEN: () => SEVEN,
  SIX: () => SIX,
  TEN: () => TEN,
  THOUSAND: () => THOUSAND,
  THREE: () => THREE,
  TRILLION: () => TRILLION,
  TWO: () => TWO,
  ZERO: () => ZERO,
  abs: () => abs,
  add: () => add,
  ceil: () => ceil,
  cmp: () => cmp,
  div: () => div,
  eq: () => eq,
  factor: () => factor,
  floor: () => floor,
  fraction: () => fraction,
  gt: () => gt,
  gte: () => gte,
  integer: () => integer,
  isBigFloat: () => isBigFloat,
  isInteger: () => isInteger,
  isNegative: () => isNegative,
  isPositive: () => isPositive,
  isZero: () => isZero,
  lt: () => lt,
  lte: () => lte,
  max: () => max,
  min: () => min,
  minmax: () => minmax,
  mul: () => mul,
  neg: () => neg,
  pow: () => pow,
  scientific: () => scientific,
  set_precision: () => import_bigfloat_esnext6.set_precision,
  sqrt: () => sqrt,
  sub: () => sub
});
module.exports = __toCommonJS(index_exports);

// src/bigfloat.ts
var import_bigfloat_esnext = require("bigfloat-esnext");
(0, import_bigfloat_esnext.set_precision)(-12);
var make = (number) => {
  if (typeof number === "string") {
    const lower = number.toLowerCase();
    if (lower.includes("e")) {
      if (lower.includes("+")) {
        return (0, import_bigfloat_esnext.make)(lower.replaceAll("+", ""));
      }
      return (0, import_bigfloat_esnext.make)(lower);
    }
  }
  return (0, import_bigfloat_esnext.make)(number);
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
    return (0, import_bigfloat_esnext.string)(this, radix);
  }
};

// src/constructors.ts
var import_bigfloat_esnext2 = require("bigfloat-esnext");
var scientific = (number) => {
  return (0, import_bigfloat_esnext2.scientific)(make(number));
};
var fraction = (number) => {
  return new BigFloat((0, import_bigfloat_esnext2.fraction)(make(number)));
};
var integer = (number) => {
  return new BigFloat((0, import_bigfloat_esnext2.integer)(make(number)));
};

// src/arithmetic.ts
var import_bigfloat_esnext3 = require("bigfloat-esnext");
var neg = (a) => new BigFloat((0, import_bigfloat_esnext3.neg)(make(a)));
var abs = (a) => new BigFloat((0, import_bigfloat_esnext3.abs)(make(a)));
var add = (a, ...other) => {
  return new BigFloat(
    other.reduce((prev, current) => {
      return (0, import_bigfloat_esnext3.add)(make(prev), make(current));
    }, a)
  );
};
var sub = (a, ...other) => {
  return new BigFloat(
    other.reduce((prev, current) => {
      return (0, import_bigfloat_esnext3.sub)(make(prev), make(current));
    }, a)
  );
};
var mul = (multiplicand, ...multipliers) => {
  return new BigFloat(
    multipliers.reduce((prev, current) => {
      return (0, import_bigfloat_esnext3.mul)(make(prev), make(current));
    }, multiplicand)
  );
};
var div = (dividend, divisor, precision) => {
  return new BigFloat((0, import_bigfloat_esnext3.div)(make(dividend), make(divisor), precision));
};
var sqrt = (a) => new BigFloat((0, import_bigfloat_esnext3.sqrt)(make(a)));
var ceil = (a, precision = 0, divisorPrecision) => {
  const divisor = make(Math.pow(10, precision));
  return new BigFloat((0, import_bigfloat_esnext3.div)((0, import_bigfloat_esnext3.ceil)((0, import_bigfloat_esnext3.mul)(make(a), divisor)), divisor, divisorPrecision));
};
var floor = (a, precision = 0, divisorPrecision) => {
  const divisor = make(Math.pow(10, precision));
  return new BigFloat((0, import_bigfloat_esnext3.div)((0, import_bigfloat_esnext3.floor)((0, import_bigfloat_esnext3.mul)(make(a), divisor)), divisor, divisorPrecision));
};
var pow = (base, exp) => {
  return new BigFloat((0, import_bigfloat_esnext3.exponentiation)(make(base), make(exp)));
};
var factor = (number) => {
  const value = make(number);
  const ZERO2 = make(0);
  if ((0, import_bigfloat_esnext3.lt)(value, ZERO2)) {
    const NEG_ONE = make(-1);
    return new BigFloat((0, import_bigfloat_esnext3.mul)(NEG_ONE, factor((0, import_bigfloat_esnext3.mul)(value, NEG_ONE))));
  }
  const ONE2 = make(1);
  if ((0, import_bigfloat_esnext3.eq)(value, ZERO2) || (0, import_bigfloat_esnext3.eq)(value, ONE2)) {
    return new BigFloat(ONE2);
  }
  return new BigFloat((0, import_bigfloat_esnext3.mul)(value, factor((0, import_bigfloat_esnext3.sub)(value, ONE2))));
};

// src/relational.ts
var import_bigfloat_esnext4 = require("bigfloat-esnext");
var eq = (a, b) => (0, import_bigfloat_esnext4.eq)(make(a), make(b));
var lt = (a, b) => (0, import_bigfloat_esnext4.lt)(make(a), make(b));
var lte = (a, b) => (0, import_bigfloat_esnext4.lte)(make(a), make(b));
var gt = (a, b) => (0, import_bigfloat_esnext4.gt)(make(a), make(b));
var gte = (a, b) => (0, import_bigfloat_esnext4.gte)(make(a), make(b));
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
var import_bigfloat_esnext5 = require("bigfloat-esnext");
var isBigFloat = (number) => {
  return number instanceof BigFloat;
};
var isInteger = (number) => {
  return (0, import_bigfloat_esnext5.is_integer)(make(number));
};
var isNegative = (number) => {
  return (0, import_bigfloat_esnext5.is_negative)(make(number));
};
var isPositive = (number) => {
  if (isZero(number)) {
    return false;
  }
  return (0, import_bigfloat_esnext5.is_positive)(make(number));
};
var isZero = (number) => {
  return (0, import_bigfloat_esnext5.is_zero)(make(number));
};

// src/index.ts
var import_bigfloat_esnext6 = require("bigfloat-esnext");

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  set_precision,
  sqrt,
  sub
});
