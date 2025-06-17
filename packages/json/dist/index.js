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

// src/type/infinity.ts
var P = Infinity;
var N = -Infinity;
var $infinity = {
  is: (v) => v === P || v === N,
  parse: (v) => v === 1 ? P : N,
  stringify: (v) => v > 0 ? 1 : 0
};

// src/type/undefined.ts
var $undefined = {
  is: (v) => typeof v === "undefined",
  replace: (_) => void 0,
  stringify: (_) => 0
};
var isUndefined = (value) => {
  return typeof value === "object" && value !== null && Object.keys(value).length === 1 && "$undefined" in value && value.$undefined === 0;
};

// src/type/map.ts
var $map = {
  is: (v) => v instanceof Map,
  parse: (v) => new Map(
    v.map((pair) => {
      return pair.map((i) => isUndefined(i) ? void 0 : i);
    })
  ),
  stringify: (v) => Array.from(v)
};

// src/type/nan.ts
var $nan = {
  is: (v) => typeof v === "number" && isNaN(v),
  parse: (_) => NaN,
  stringify: (_) => 0
};

// src/type/regexp.ts
var $regexp = {
  is: (v) => v instanceof RegExp,
  parse: (v) => new RegExp(v[0], v[1]),
  stringify: (v) => [v.source, v.flags]
};

// src/type/set.ts
var $set = {
  is: (v) => v instanceof Set,
  parse: (v) => new Set(v.map((i) => isUndefined(i) ? void 0 : i)),
  stringify: (v) => Array.from(v)
};

// src/type/binary.ts
var $binary = {
  is: (v) => v instanceof Uint8Array,
  parse: (v) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0)),
  stringify: (v) => btoa(String.fromCharCode(...v))
};

// src/type/url.ts
var $url = {
  is: (v) => v instanceof URL,
  parse: (v) => new URL(v),
  stringify: (v) => v.toString()
};

// src/type/duration.ts
import { Duration } from "@awsless/duration";
var $duration = {
  is: (v) => v instanceof Duration,
  parse: (v) => new Duration(BigInt(v)),
  stringify: (v) => v.value.toString()
};

// src/type/index.ts
var baseTypes = {
  $undefined,
  $duration,
  $infinity,
  $bigfloat,
  $bigint,
  $regexp,
  $binary,
  $date,
  $set,
  $map,
  $nan,
  $url
};

// src/parse.ts
var parse = (json, types = {}) => {
  const replacements = [];
  const result = JSON.parse(
    json,
    createReviver(types, (target, key, value) => {
      replacements.push([target, key, value]);
    })
  );
  for (const [target, key, value] of replacements) {
    target[key] = value;
  }
  return result;
};
var createReviver = (types = {}, registerReplacement) => {
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
          const stringified = original[typeName];
          if ("parse" in type) {
            return type.parse(stringified);
          } else if (registerReplacement) {
            const result = type.replace(stringified);
            registerReplacement(this, key, result);
            return result;
          } else {
            return type.replace(stringified);
          }
        }
      }
    }
    return value;
  };
};

// src/stringify.ts
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

// src/patch.ts
var patch = (value, types = {}) => {
  return parse(JSON.stringify(value), types);
};
var unpatch = (value, types = {}) => {
  return JSON.parse(stringify(value, types));
};

// src/global.ts
var setGlobalTypes = (types) => {
  Object.assign(baseTypes, types);
};

// src/type/mockdate.ts
var $mockdate = {
  is: (v) => typeof v === "object" && v !== null && "toISOString" in v && typeof v.toISOString === "function" && "getTime" in v && typeof v.getTime === "function" && "toUTCString" in v && typeof v.toUTCString === "function",
  parse: (v) => new Date(v),
  stringify: (v) => v.toISOString()
};

// src/safe-number/parse.ts
var safeNumberParse = (json, props) => {
  return JSON.parse(
    json,
    // @ts-ignore
    createSafeNumberReviver(props)
  );
};
var createSafeNumberReviver = (props) => {
  return (_, value, context) => {
    if (typeof value === "number") {
      return props.parse(context.source);
    }
    return value;
  };
};

// src/safe-number/stringify.ts
var safeNumberStringify = (value, props) => {
  return JSON.stringify(value, createSafeNumberReplacer(props));
};
var createSafeNumberReplacer = (props) => {
  return function(key, value) {
    const original = this[key];
    if (props.is(original)) {
      return JSON.rawJSON(props.stringify(original));
    }
    return value;
  };
};
export {
  $mockdate,
  createReplacer,
  createReviver,
  createSafeNumberReplacer,
  createSafeNumberReviver,
  parse,
  patch,
  safeNumberParse,
  safeNumberStringify,
  setGlobalTypes,
  stringify,
  unpatch
};
