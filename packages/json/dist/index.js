// src/type/bigfloat.ts
import { BigFloat } from "@awsless/big-float";
var $bigfloat = {
  is: (v) => v instanceof BigFloat,
  parse: (v) => new BigFloat(v),
  stringify: (v) => v.toString()
};

// src/type/bigint.ts
var $bigint = {
  is: (v) => typeof v === "bigint",
  parse: (v) => BigInt(v),
  stringify: (v) => v.toString()
};

// src/type/date.ts
var $date = {
  is: (v) => v instanceof Date,
  parse: (v) => new Date(v),
  stringify: (v) => v.toISOString()
};

// src/type/map.ts
var $map = {
  is: (v) => v instanceof Map,
  parse: (v) => new Map(v),
  stringify: (v) => Array.from(v)
};

// src/type/set.ts
var $set = {
  is: (v) => v instanceof Set,
  parse: (v) => new Set(v),
  stringify: (v) => Array.from(v)
};

// src/index.ts
var baseTypes = {
  $bigfloat,
  $bigint,
  $date,
  $set,
  $map
};
var parse = (json, types = {}) => {
  return JSON.parse(json, createReviver(types));
};
var createReviver = (types = {}) => {
  types = {
    ...baseTypes,
    ...types
  };
  return function(key, value) {
    const original = this[key];
    if (original !== null && typeof original === "object") {
      const keys = Object.keys(original);
      if (keys.length === 1) {
        const typeName = keys[0];
        if (typeName in types && types[typeName]) {
          const type = types[typeName];
          return type.parse(original[typeName]);
        }
      }
    }
    return value;
  };
};
var stringify = (value, types = {}) => {
  return JSON.stringify(value, createReplacer(types));
};
var createReplacer = (types = {}) => {
  types = {
    ...baseTypes,
    ...types
  };
  return function(key, value) {
    const original = this[key];
    for (const [typeName, type] of Object.entries(types)) {
      if (type.is(original)) {
        return {
          [typeName]: type.stringify(original)
        };
      }
    }
    return value;
  };
};
export {
  createReplacer,
  createReviver,
  parse,
  stringify
};
