// src/types/bigfloat.ts
import { coerce, define, number, string, union, refine, object, bigint } from "superstruct";
import { BigFloat, gt } from "@awsless/big-float";
var bigfloat = () => {
  const base = define("bigfloat", (value) => {
    return value instanceof BigFloat || "Invalid number";
  });
  const bigFloatLike = coerce(base, object({
    exponent: number(),
    coefficient: bigint()
  }), (value) => {
    return new BigFloat(value);
  });
  return coerce(bigFloatLike, union([string(), number()]), (value) => {
    if (typeof value === "string" && value !== "" || typeof value === "number") {
      if (!isNaN(Number(value))) {
        return new BigFloat(value);
      }
    }
    return null;
  });
};
var positive = (struct2) => {
  const expected = `Expected a positive ${struct2.type}`;
  const ZERO = new BigFloat(0);
  return refine(struct2, "positive", (value) => {
    return gt(value, ZERO) || `${expected} but received '${value}'`;
  });
};
var precision = (struct2, decimals) => {
  const expected = `Expected a ${struct2.type}`;
  return refine(struct2, "precision", (value) => {
    const big = new BigFloat(value);
    return -big.exponent <= decimals || `${expected} with ${decimals} decimals`;
  });
};

// src/types/date.ts
import { coerce as coerce2, date as sdate, string as string2 } from "superstruct";
var date = () => {
  return coerce2(sdate(), string2(), (value) => {
    return new Date(value);
  });
};

// src/types/uuid.ts
import { define as define2 } from "superstruct";
var uuid = () => {
  return define2("uuid", (value) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
  });
};

// src/types/json.ts
import { coerce as coerce3, string as string3 } from "superstruct";
var json = (struct2) => {
  return coerce3(struct2, string3(), (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  });
};

// src/types/string.ts
import { coerce as coerce4, string as string4 } from "superstruct";
var lowercase = (struct2) => {
  return coerce4(struct2, string4(), (value) => value.toLowerCase());
};
var uppercase = (struct2) => {
  return coerce4(struct2, string4(), (value) => value.toUpperCase());
};

// src/types/array.ts
import { refine as refine2 } from "superstruct";
function unique(struct2, compare = (a, b) => a === b) {
  return refine2(struct2, "unique", (value) => {
    for (const x in value) {
      for (const y in value) {
        if (x !== y && compare(value[x], value[y])) {
          return `Expected a ${struct2.type} with unique values, but received "${value}"`;
        }
      }
    }
    return true;
  });
}

// src/index.ts
import {
  coerce as coerce5,
  defaulted,
  trimmed,
  empty,
  max,
  min,
  nonempty,
  pattern,
  size,
  refine as refine3,
  any,
  array,
  bigint as bigint2,
  boolean,
  enums,
  func,
  instance,
  integer,
  intersection,
  literal,
  map,
  never,
  nullable,
  number as number2,
  object as object2,
  optional,
  record,
  regexp,
  set,
  string as string5,
  tuple,
  type,
  union as union2,
  unknown,
  assign,
  define as define3,
  deprecated,
  dynamic,
  lazy,
  omit,
  partial,
  pick,
  struct,
  assert,
  create,
  mask,
  is,
  Struct as Struct7,
  StructError
} from "superstruct";
export {
  Struct7 as Struct,
  StructError,
  any,
  array,
  assert,
  assign,
  bigfloat,
  bigint2 as bigint,
  boolean,
  coerce5 as coerce,
  create,
  date,
  defaulted,
  define3 as define,
  deprecated,
  dynamic,
  empty,
  enums,
  func,
  instance,
  integer,
  intersection,
  is,
  json,
  lazy,
  literal,
  lowercase,
  map,
  mask,
  max,
  min,
  never,
  nonempty,
  nullable,
  number2 as number,
  object2 as object,
  omit,
  optional,
  partial,
  pattern,
  pick,
  positive,
  precision,
  record,
  refine3 as refine,
  regexp,
  set,
  size,
  string5 as string,
  struct,
  trimmed,
  tuple,
  type,
  union2 as union,
  unique,
  unknown,
  uppercase,
  uuid
};
