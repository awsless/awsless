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
  Size: () => Size,
  bytes: () => bytes,
  gibibytes: () => gibibytes,
  kibibytes: () => kibibytes,
  mebibytes: () => mebibytes,
  parse: () => parse,
  pebibytes: () => pebibytes,
  tebibytes: () => tebibytes,
  toBytes: () => toBytes,
  toGibibytes: () => toGibibytes,
  toKibibytes: () => toKibibytes,
  toMebibytes: () => toMebibytes,
  toPebibytes: () => toPebibytes,
  toTebibytes: () => toTebibytes
});
module.exports = __toCommonJS(src_exports);

// src/size.ts
var BI = 1024n;
var KIBI = BI;
var MEBI = KIBI * BI;
var GIBI = MEBI * BI;
var TEBI = GIBI * BI;
var PEBI = TEBI * BI;
var Size = class {
  constructor(value) {
    this.value = value;
  }
};
var bytes = (value) => {
  return new Size(BigInt(value));
};
var kibibytes = (value) => {
  return new Size(BigInt(value) * KIBI);
};
var mebibytes = (value) => {
  return new Size(BigInt(value) * MEBI);
};
var gibibytes = (value) => {
  return new Size(BigInt(value) * GIBI);
};
var tebibytes = (value) => {
  return new Size(BigInt(value) * TEBI);
};
var pebibytes = (value) => {
  return new Size(BigInt(value) * PEBI);
};
var toBytes = (size) => {
  return size.value;
};
var toKibibytes = (size) => {
  return size.value / KIBI;
};
var toMebibytes = (size) => {
  return size.value / MEBI;
};
var toGibibytes = (size) => {
  return size.value / GIBI;
};
var toTebibytes = (size) => {
  return size.value / TEBI;
};
var toPebibytes = (size) => {
  return size.value / PEBI;
};

// src/parse.ts
var parse = (value) => {
  const [count, unit] = value.split(/\s+/);
  const number = BigInt(count);
  switch (unit) {
    case "B":
      return bytes(number);
    case "KB":
    case "KiB":
      return kibibytes(number);
    case "MB":
    case "MiB":
      return mebibytes(number);
    case "GB":
    case "GiB":
      return gibibytes(number);
    case "TB":
    case "TiB":
      return tebibytes(number);
    case "PB":
    case "PiB":
      return pebibytes(number);
  }
  throw new SyntaxError(`Invalid size: ${value}`);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Size,
  bytes,
  gibibytes,
  kibibytes,
  mebibytes,
  parse,
  pebibytes,
  tebibytes,
  toBytes,
  toGibibytes,
  toKibibytes,
  toMebibytes,
  toPebibytes,
  toTebibytes
});
