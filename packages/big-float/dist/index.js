var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/internal/index.ts
var internal_exports = {};
__export(internal_exports, {
  abs: () => abs,
  add: () => add,
  ceil: () => ceil,
  clamp: () => clamp,
  cmp: () => cmp,
  div: () => div,
  eq: () => eq,
  fact: () => fact,
  floor: () => floor,
  fraction: () => fraction,
  gt: () => gt,
  gte: () => gte,
  integer: () => integer,
  isBigFloatLike: () => isBigFloatLike,
  isInteger: () => isInteger,
  isNegative: () => isNegative,
  isPositive: () => isPositive,
  isZero: () => isZero,
  lt: () => lt,
  lte: () => lte,
  make: () => make,
  max: () => max,
  min: () => min,
  mul: () => mul,
  neg: () => neg,
  normalize: () => normalize,
  number: () => number,
  parse: () => parse,
  pow: () => pow,
  round: () => round,
  scientific: () => scientific,
  sqrt: () => sqrt,
  string: () => string,
  sub: () => sub
});

// src/percision.ts
var PRECISION = 20;
var setPrecision = (n) => {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError("Only positive integers are allowed for precision");
  }
  PRECISION = n;
};

// src/internal/constructors.ts
var number = (a) => {
  if (typeof a === "number") {
    return a;
  }
  if (typeof a === "string" || typeof a === "bigint") {
    return Number(a);
  }
  return a.exponent === 0 ? Number(a.coefficient) : Number(a.coefficient) * 10 ** a.exponent;
};
var normalize = (a) => {
  let { coefficient, exponent } = a;
  if (exponent !== 0) {
    if (exponent > 0) {
      coefficient = coefficient * 10n ** BigInt(exponent);
      exponent = 0;
    } else {
      while (exponent <= -7) {
        const remainder = coefficient % 10000000n;
        if (remainder !== 0n) {
          break;
        }
        coefficient = coefficient / 10000000n;
        exponent += 7;
      }
      while (exponent < 0) {
        const remainder = coefficient % 10n;
        if (remainder !== 0n) {
          break;
        }
        coefficient = coefficient / 10n;
        exponent += 1;
      }
    }
  }
  return { coefficient, exponent };
};
var integer = (a) => {
  const { coefficient, exponent } = a;
  if (exponent === 0) {
    return a;
  }
  if (exponent > 0) {
    return make(coefficient * 10n ** BigInt(exponent), 0);
  }
  return make(coefficient / 10n ** BigInt(-exponent), 0);
};
var fraction = (a) => {
  return sub(a, integer(a));
};
var make = (coefficient, exponent) => {
  const bigfloat = { coefficient, exponent };
  Object.freeze(bigfloat);
  return bigfloat;
};
var string = (a, radix) => {
  if (isZero(a)) {
    return "0";
  }
  if (radix) {
    return integer(a).coefficient.toString(radix);
  }
  a = normalize(a);
  const isNeg = isNegative(a);
  let s = (isNeg ? -a.coefficient : a.coefficient).toString();
  if (a.exponent < 0) {
    let point = s.length + a.exponent;
    if (point <= 0) {
      s = "0".repeat(1 - point) + s;
      point = 1;
    }
    s = s.slice(0, point) + "." + s.slice(point);
  } else if (a.exponent > 0) {
    s += "0".repeat(a.exponent);
  }
  if (isNeg) {
    s = "-" + s;
  }
  return s;
};
var scientific = (a) => {
  if (isZero(a)) {
    return "0";
  }
  a = normalize(a);
  const isNeg = isNegative(a);
  let s = String(isNeg ? -a.coefficient : a.coefficient);
  const e = a.exponent + s.length - 1;
  if (s.length > 1) {
    let fractionalPart = s.slice(1);
    fractionalPart = fractionalPart.replace(/0+$/, "");
    if (fractionalPart.length > 0) {
      s = s.slice(0, 1) + "." + fractionalPart;
    } else {
      s = s.slice(0, 1);
    }
  }
  if (e !== 0) {
    s += "e" + e;
  }
  if (isNeg) {
    s = "-" + s;
  }
  return s;
};

// src/internal/relational.ts
var eq = (comparahend, comparator) => {
  return comparahend === comparator || isZero(sub(comparahend, comparator));
};
var lt = (comparahend, comparator) => {
  return isNegative(sub(comparahend, comparator));
};
var lte = (comparahend, comparator) => {
  return lt(comparahend, comparator) || eq(comparahend, comparator);
};
var gt = (comparahend, comparator) => {
  return lt(comparator, comparahend);
};
var gte = (comparahend, comparator) => {
  return gt(comparahend, comparator) || eq(comparahend, comparator);
};
var cmp = (a, b) => {
  if (gt(a, b)) {
    return 1;
  } else if (lt(a, b)) {
    return -1;
  }
  return 0;
};
var min = (...values) => {
  return values.reduce((prev, current) => {
    return lt(prev, current) ? prev : current;
  });
};
var max = (...values) => {
  return values.reduce((prev, current) => {
    return gt(prev, current) ? prev : current;
  });
};
var clamp = (number2, min3, max3) => {
  if (gt(min3, max3)) {
    throw new TypeError(`min ${min3} bound can't be greater then the max ${max3} bound`);
  }
  return lt(number2, min3) ? min3 : gt(number2, max3) ? max3 : number2;
};

// src/internal/predicates.ts
var isBigFloatLike = (n) => {
  return typeof n === "object" && "coefficient" in n && typeof n.coefficient === "bigint" && "exponent" in n && typeof n.exponent === "number" && Number.isSafeInteger(n.exponent);
};
var isNegative = (big) => {
  return big.coefficient < 0n;
};
var isPositive = (big) => {
  return big.coefficient > 0n;
};
var isZero = (big) => {
  return big.coefficient === 0n;
};
var isInteger = (big) => {
  return eq(big, integer(big));
};

// src/internal/parser.ts
var parse = (a) => {
  if (typeof a === "bigint") {
    return { coefficient: a, exponent: 0 };
  } else if (typeof a === "string" || typeof a === "number") {
    const number_pattern = /^(-?\d+)(?:\.(\d*))?(?:e([\-\+]?\d+))?$/i;
    const parts = String(a).match(number_pattern);
    if (parts) {
      const frac = parts[2] ?? "";
      return {
        coefficient: BigInt(parts[1] + frac),
        exponent: Number(parts[3] ?? 0) - frac.length
      };
    }
  } else if (isBigFloatLike(a)) {
    return a;
  }
  throw new TypeError("Invalid BigFloat");
};

// src/internal/constants.ts
var EPSILON = /* @__PURE__ */ parse("0.0000000000000000000000000000000000000000000000001");
var ZERO = /* @__PURE__ */ parse("0");
var ONE = /* @__PURE__ */ parse("1");
var TWO = /* @__PURE__ */ parse("2");
var NEG_ONE = /* @__PURE__ */ parse("-1");

// src/internal/arithmetic.ts
var conformOp = (op) => {
  return (a, b) => {
    const differential = a.exponent - b.exponent;
    if (differential === 0) {
      return make(op(a.coefficient, b.coefficient), a.exponent);
    }
    if (differential > 0) {
      return make(op(a.coefficient * 10n ** BigInt(differential), b.coefficient), b.exponent);
    }
    return make(op(a.coefficient, b.coefficient * 10n ** BigInt(-differential)), a.exponent);
  };
};
var add = conformOp((a, b) => a + b);
var sub = conformOp((a, b) => a - b);
var neg = (a) => {
  return make(-a.coefficient, a.exponent);
};
var abs = (a) => {
  return isNegative(a) ? neg(a) : a;
};
var mul = (multiplicand, multiplier) => {
  return make(multiplicand.coefficient * multiplier.coefficient, multiplicand.exponent + multiplier.exponent);
};
var div = (dividend, divisor, precision = PRECISION) => {
  if (isZero(divisor)) {
    throw new TypeError("Divide by zero");
  }
  if (isZero(dividend)) {
    return ZERO;
  }
  if (!Number.isInteger(precision) || precision < 0) {
    throw new TypeError("Only positive integers are allowed for precision");
  }
  if (precision === 0) {
    return integer(div(dividend, divisor, 10));
  }
  const extraPrecision = 1;
  const totalPrecision = precision + extraPrecision;
  const p = -totalPrecision;
  let { coefficient, exponent } = dividend;
  exponent -= divisor.exponent;
  if (exponent > p) {
    coefficient = coefficient * 10n ** BigInt(exponent - p);
    exponent = p;
  }
  const quotient = coefficient / divisor.coefficient;
  const isNegativeResult = quotient < 0n;
  const absQuotient = isNegativeResult ? -quotient : quotient;
  const roundedAbsQuotient = (absQuotient + 5n) / 10n;
  const roundedQuotient = isNegativeResult ? -roundedAbsQuotient : roundedAbsQuotient;
  const finalExponent = exponent + extraPrecision;
  return make(roundedQuotient, finalExponent);
};
var sqrt = (n) => {
  if (isZero(n)) {
    return ZERO;
  }
  if (eq(n, ONE)) {
    return ONE;
  }
  if (isNegative(n)) {
    throw new TypeError("No square root");
  }
  let x;
  const coeffStr = n.coefficient.toString();
  const bitLength = coeffStr.length + n.exponent;
  if (bitLength > 0) {
    const halfBitLength = Math.floor(bitLength / 2);
    x = make(10n ** BigInt(Math.max(0, halfBitLength - 1)), 0);
  } else {
    x = n;
  }
  let prev;
  let iterations = 0;
  const maxIterations = 100;
  do {
    prev = x;
    x = div(add(x, div(n, x)), TWO);
    iterations++;
    if (iterations > 10) {
      const diff = abs(sub(x, prev));
      if (gt(diff, div(abs(x), make(1000n, 0)))) {
        break;
      }
    }
  } while (gt(abs(sub(x, prev)), EPSILON) && iterations < maxIterations);
  return x;
};
var pow = (base, exp) => {
  if (eq(exp, ZERO)) {
    return ONE;
  }
  if (isNegative(exp)) {
    return div(ONE, pow(base, abs(exp)));
  }
  if (exp.exponent === 0) {
    let result = base;
    let n = 1;
    while (n !== number(exp)) {
      result = mul(result, base);
      n += 1;
    }
    return result;
  }
  if (gt(exp, ONE) || eq(exp, ONE)) {
    const temp = pow(base, div(exp, TWO));
    return mul(temp, temp);
  }
  let low = ZERO;
  let high = ONE;
  let sqr = sqrt(base);
  let acc = sqr;
  let mid = div(high, TWO);
  while (gt(abs(sub(mid, exp)), EPSILON)) {
    sqr = sqrt(sqr);
    if (lt(mid, exp) || eq(mid, exp)) {
      low = mid;
      acc = mul(acc, sqr);
    } else {
      high = mid;
      acc = mul(acc, div(ONE, sqr));
    }
    mid = div(add(low, high), TWO);
  }
  return acc;
};
var ceil = (n) => {
  if (isInteger(n)) {
    return n;
  } else {
    return make(integer(n).coefficient + 1n, 0);
  }
};
var floor = (n) => {
  return integer(n);
};
var round = (n) => {
  if (n.exponent >= 0) {
    return n;
  }
  const factor = 10n ** BigInt(-n.exponent);
  if (isNegative(n)) {
    return make((n.coefficient - factor / 2n) / factor, 0);
  }
  return make((n.coefficient + factor / 2n) / factor, 0);
};
var fact = (n) => {
  if (lt(n, ZERO)) {
    return mul(NEG_ONE, fact(mul(n, NEG_ONE)));
  }
  if (eq(n, ZERO) || eq(n, ONE)) {
    return ONE;
  }
  return mul(n, fact(sub(n, ONE)));
};

// src/bigfloat.ts
var BigFloat = class {
  /**
   * The power of 10 applied to the coefficient.
   * @type {number}
   */
  exponent;
  /**
   * The integer coefficient of the floating-point number.
   * @type {bigint}
   */
  coefficient;
  /**
   * Creates a new BigFloat instance from a numeric value.
   * @param {Numeric} n - The number to parse into a BigFloat.
   */
  constructor(n) {
    const { exponent, coefficient } = parse(n);
    this.exponent = exponent;
    this.coefficient = coefficient;
  }
  /**
   * Converts the BigFloat to a JSON-compatible string representation.
   * Equivalent to calling {@link BigFloat.toString}.
   * @returns {string} A string representation of the BigFloat.
   */
  toJSON() {
    return this.toString();
  }
  /**
   * Converts the BigFloat to its string representation.
   * @param {number} [radix] - The base/radix for string conversion (e.g. 10 for decimal, 16 for hex).
   * @returns {string} A string representation of the BigFloat.
   */
  toString(radix) {
    return string(this, radix);
  }
};

// src/constructors.ts
var make2 = (n) => {
  return new BigFloat(n);
};
var fraction2 = (n) => {
  return make2(fraction(parse(n)));
};
var integer2 = (n) => {
  return make2(integer(parse(n)));
};
var string2 = (n) => {
  return string(parse(n));
};
var scientific2 = (n) => {
  return scientific(parse(n));
};

// src/arithmetic.ts
var neg2 = (n) => make2(neg(parse(n)));
var abs2 = (n) => make2(abs(parse(n)));
var add2 = (n, ...other) => {
  return make2(
    other.map(parse).reduce((prev, current) => {
      return add(prev, current);
    }, parse(n))
  );
};
var sub2 = (n, ...other) => {
  return make2(
    other.map(parse).reduce((prev, current) => {
      return sub(prev, current);
    }, parse(n))
  );
};
var mul2 = (multiplicand, ...multipliers) => {
  return make2(
    multipliers.map(parse).reduce((prev, current) => {
      return mul(prev, current);
    }, parse(multiplicand))
  );
};
var div2 = (dividend, divisor, precision) => {
  return make2(div(parse(dividend), parse(divisor), precision));
};
var sqrt2 = (n) => make2(sqrt(parse(n)));
var ceil2 = (n, precision = 0, divisorPrecision) => {
  const divisor = parse(Math.pow(10, precision));
  return make2(div(ceil(mul(parse(n), divisor)), divisor, divisorPrecision));
};
var floor2 = (n, precision = 0, divisorPrecision) => {
  const divisor = parse(Math.pow(10, precision));
  return make2(div(floor(mul(parse(n), divisor)), divisor, divisorPrecision));
};
var round2 = (n, precision = 0, divisorPrecision) => {
  const divisor = parse(Math.pow(10, precision));
  return make2(div(round(mul(parse(n), divisor)), divisor, divisorPrecision));
};
var pow2 = (base, exp) => {
  return make2(pow(parse(base), parse(exp)));
};
var fact2 = (n) => {
  return make2(fact(parse(n)));
};

// src/constants.ts
var ZERO2 = /* @__PURE__ */ new BigFloat(0);
var ONE2 = /* @__PURE__ */ new BigFloat(1);
var TWO2 = /* @__PURE__ */ new BigFloat(2);
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

// src/predicates.ts
var isBigFloat = (n) => {
  return n instanceof BigFloat;
};
var isInteger2 = (n) => {
  return isInteger(parse(n));
};
var isNegative2 = (n) => {
  return isNegative(parse(n));
};
var isPositive2 = (n) => {
  return isPositive(parse(n));
};
var isZero2 = (n) => {
  return isZero(parse(n));
};

// src/relational.ts
var eq2 = (a, b) => eq(parse(a), parse(b));
var lt2 = (a, b) => lt(parse(a), parse(b));
var lte2 = (a, b) => lte(parse(a), parse(b));
var gt2 = (a, b) => gt(parse(a), parse(b));
var gte2 = (a, b) => gte(parse(a), parse(b));
var cmp2 = (a, b) => {
  if (gt2(a, b)) {
    return 1;
  } else if (lt2(a, b)) {
    return -1;
  }
  return 0;
};
var min2 = (...numbers) => {
  return make2(min(...numbers.map((v) => parse(v))));
};
var max2 = (...numbers) => {
  return make2(max(...numbers.map((v) => parse(v))));
};
var clamp2 = (number2, min3, max3) => {
  return make2(clamp(parse(number2), parse(min3), parse(max3)));
};
export {
  BILLION,
  BigFloat,
  EIGHT,
  FIVE,
  FOUR,
  HUNDRED,
  MILLION,
  NINE,
  ONE2 as ONE,
  PRECISION,
  SEVEN,
  SIX,
  TEN,
  THOUSAND,
  THREE,
  TRILLION,
  TWO2 as TWO,
  ZERO2 as ZERO,
  abs2 as abs,
  add2 as add,
  ceil2 as ceil,
  clamp2 as clamp,
  cmp2 as cmp,
  div2 as div,
  eq2 as eq,
  fact2 as fact,
  floor2 as floor,
  fraction2 as fraction,
  gt2 as gt,
  gte2 as gte,
  integer2 as integer,
  internal_exports as internal,
  isBigFloat,
  isInteger2 as isInteger,
  isNegative2 as isNegative,
  isPositive2 as isPositive,
  isZero2 as isZero,
  lt2 as lt,
  lte2 as lte,
  make2 as make,
  max2 as max,
  min2 as min,
  mul2 as mul,
  neg2 as neg,
  pow2 as pow,
  round2 as round,
  scientific2 as scientific,
  setPrecision,
  sqrt2 as sqrt,
  string2 as string,
  sub2 as sub
};
