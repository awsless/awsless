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
  createReplacer: () => createReplacer,
  createReviver: () => createReviver,
  createSafeNumberReplacer: () => createSafeNumberReplacer,
  createSafeNumberReviver: () => createSafeNumberReviver,
  parse: () => parse,
  patch: () => patch,
  safeNumberParse: () => safeNumberParse,
  safeNumberStringify: () => safeNumberStringify,
  stringify: () => stringify,
  unpatch: () => unpatch
});
module.exports = __toCommonJS(src_exports);

// src/type/bigfloat.ts
var import_big_float = require("@awsless/big-float");
var $bigfloat = {
  is: (v) => v instanceof import_big_float.BigFloat,
  parse: (v) => new import_big_float.BigFloat(v),
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

// src/type/undefined.ts
var $undefined = {
  is: (v) => typeof v === "undefined",
  parse: (_) => void 0,
  stringify: (_) => 0
};

// src/type/index.ts
var baseTypes = {
  $undefined,
  $bigfloat,
  $bigint,
  $date,
  $set,
  $map
};

// src/parse.ts
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

// src/safe-number/parse.ts
var safeNumberParse = (json, props) => {
  return JSON.parse(
    json,
    // @ts-ignore
    createSafeNumberReviver(props)
  );
};
var createSafeNumberReviver = (props) => {
  return function(_, value, context) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createReplacer,
  createReviver,
  createSafeNumberReplacer,
  createSafeNumberReviver,
  parse,
  patch,
  safeNumberParse,
  safeNumberStringify,
  stringify,
  unpatch
});
