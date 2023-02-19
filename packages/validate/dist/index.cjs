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
var src_exports = {};
__export(src_exports, {
  Struct: () => import_superstruct7.Struct,
  StructError: () => import_superstruct7.StructError,
  any: () => import_superstruct7.any,
  array: () => import_superstruct7.array,
  assert: () => import_superstruct7.assert,
  assign: () => import_superstruct7.assign,
  bigfloat: () => bigfloat,
  bigint: () => import_superstruct7.bigint,
  boolean: () => import_superstruct7.boolean,
  coerce: () => import_superstruct7.coerce,
  create: () => import_superstruct7.create,
  date: () => date,
  defaulted: () => import_superstruct7.defaulted,
  define: () => import_superstruct7.define,
  deprecated: () => import_superstruct7.deprecated,
  dynamic: () => import_superstruct7.dynamic,
  empty: () => import_superstruct7.empty,
  enums: () => import_superstruct7.enums,
  func: () => import_superstruct7.func,
  instance: () => import_superstruct7.instance,
  integer: () => import_superstruct7.integer,
  intersection: () => import_superstruct7.intersection,
  is: () => import_superstruct7.is,
  json: () => json,
  lazy: () => import_superstruct7.lazy,
  literal: () => import_superstruct7.literal,
  lowercase: () => lowercase,
  map: () => import_superstruct7.map,
  mask: () => import_superstruct7.mask,
  max: () => import_superstruct7.max,
  min: () => import_superstruct7.min,
  never: () => import_superstruct7.never,
  nonempty: () => import_superstruct7.nonempty,
  nullable: () => import_superstruct7.nullable,
  number: () => import_superstruct7.number,
  object: () => import_superstruct7.object,
  omit: () => import_superstruct7.omit,
  optional: () => import_superstruct7.optional,
  partial: () => import_superstruct7.partial,
  pattern: () => import_superstruct7.pattern,
  pick: () => import_superstruct7.pick,
  positive: () => positive,
  precision: () => precision,
  record: () => import_superstruct7.record,
  refine: () => import_superstruct7.refine,
  regexp: () => import_superstruct7.regexp,
  set: () => import_superstruct7.set,
  size: () => import_superstruct7.size,
  string: () => import_superstruct7.string,
  struct: () => import_superstruct7.struct,
  trimmed: () => import_superstruct7.trimmed,
  tuple: () => import_superstruct7.tuple,
  type: () => import_superstruct7.type,
  union: () => import_superstruct7.union,
  unique: () => unique,
  unknown: () => import_superstruct7.unknown,
  uppercase: () => uppercase,
  uuid: () => uuid
});
module.exports = __toCommonJS(src_exports);

// src/types/bigfloat.ts
var import_superstruct = require("superstruct");
var import_big_float = require("@awsless/big-float");
var bigfloat = () => {
  const base = (0, import_superstruct.define)("bigfloat", (value) => {
    return value instanceof import_big_float.BigFloat || "Invalid number";
  });
  return (0, import_superstruct.coerce)(base, (0, import_superstruct.union)([(0, import_superstruct.string)(), (0, import_superstruct.number)()]), (value) => {
    if (typeof value === "string" && value !== "" || typeof value === "number") {
      if (!isNaN(Number(value))) {
        return new import_big_float.BigFloat(value);
      }
    }
    return null;
  });
};
var positive = (struct2) => {
  const expected = `Expected a positive ${struct2.type}`;
  const zero = new import_big_float.BigFloat(0);
  return (0, import_superstruct.refine)(struct2, "positive", (value) => {
    return (0, import_big_float.gt)(value, zero) || `${expected} but received '${value}'`;
  });
};
var precision = (struct2, decimals) => {
  const expected = `Expected a ${struct2.type}`;
  return (0, import_superstruct.refine)(struct2, "precision", (value) => {
    return -value.exponent <= decimals || `${expected} with ${decimals} decimals`;
  });
};

// src/types/date.ts
var import_superstruct2 = require("superstruct");
var date = () => {
  return (0, import_superstruct2.coerce)((0, import_superstruct2.date)(), (0, import_superstruct2.string)(), (value) => {
    return new Date(value);
  });
};

// src/types/uuid.ts
var import_superstruct3 = require("superstruct");
var uuid = () => {
  return (0, import_superstruct3.define)("uuid", (value) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
  });
};

// src/types/json.ts
var import_superstruct4 = require("superstruct");
var json = (struct2) => {
  return (0, import_superstruct4.coerce)(struct2, (0, import_superstruct4.string)(), (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  });
};

// src/types/string.ts
var import_superstruct5 = require("superstruct");
var lowercase = (struct2) => {
  return (0, import_superstruct5.coerce)(struct2, (0, import_superstruct5.string)(), (value) => value.toLowerCase());
};
var uppercase = (struct2) => {
  return (0, import_superstruct5.coerce)(struct2, (0, import_superstruct5.string)(), (value) => value.toUpperCase());
};

// src/types/array.ts
var import_superstruct6 = require("superstruct");
function unique(struct2, compare = (a, b) => a === b) {
  return (0, import_superstruct6.refine)(struct2, "unique", (value) => {
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
var import_superstruct7 = require("superstruct");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Struct,
  StructError,
  any,
  array,
  assert,
  assign,
  bigfloat,
  bigint,
  boolean,
  coerce,
  create,
  date,
  defaulted,
  define,
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
  number,
  object,
  omit,
  optional,
  partial,
  pattern,
  pick,
  positive,
  precision,
  record,
  refine,
  regexp,
  set,
  size,
  string,
  struct,
  trimmed,
  tuple,
  type,
  union,
  unique,
  unknown,
  uppercase,
  uuid
});
