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
  array: () => array,
  boolean: () => boolean,
  enumeration: () => enumeration,
  float: () => float,
  get: () => get,
  integer: () => integer,
  json: () => json,
  string: () => string
});
module.exports = __toCommonJS(src_exports);
var get = (name, defaultValue) => {
  const value = process.env[name];
  if (typeof value !== "undefined") {
    return value;
  }
  if (typeof defaultValue !== "undefined") {
    return defaultValue;
  }
  throw new TypeError(`Environment variable "${name}" hasn't been set.`);
};
var string = (name, defaultValue) => {
  return String(get(name, defaultValue));
};
var integer = (name, defaultValue) => {
  return parseInt(get(name, defaultValue), 10);
};
var float = (name, defaultValue) => {
  return parseFloat(get(name, defaultValue));
};
var boolean = (name, defaultValue) => {
  const value = get(name, defaultValue);
  if ([true, 1, "true", "TRUE", "yes", "1"].includes(value)) {
    return true;
  }
  if ([false, 0, "false", "FALSE", "no", "0"].includes(value)) {
    return false;
  }
  return !!value;
};
var array = (name, defaultValue, sep = ",") => {
  const value = get(name, defaultValue);
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === "string") {
    return value.split(sep).map((item) => String(item).trim());
  }
  throw new TypeError(`Environment variable "${name}" isn't an array.`);
};
var json = (name, defaultValue) => {
  const value = get(name, defaultValue);
  if (typeof value === "object" && value !== null) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new TypeError(`Environment variable "${name}" isn't valid JSON.`);
  }
};
var enumeration = (name, possibilities, defaultValue) => {
  const value = get(name, defaultValue);
  if (!possibilities.includes(value)) {
    throw new TypeError(
      `Environment variable "${name}" must contain one of the following values: ${possibilities.join(
        ", "
      )}.`
    );
  }
  return value;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  array,
  boolean,
  enumeration,
  float,
  get,
  integer,
  json,
  string
});
