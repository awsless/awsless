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

// src/framework/svelte.ts
var svelte_exports = {};
__export(svelte_exports, {
  locale: () => locale,
  t: () => t
});
module.exports = __toCommonJS(svelte_exports);
var import_store = require("svelte/store");
var locale = (0, import_store.writable)("en");
var t = (0, import_store.derived)([locale], ([locale2]) => {
  const api = (template, ...args) => {
    return String.raw({ raw: template.raw }, ...args);
  };
  api.get = (og, translations) => {
    return translations[locale2] ?? og;
  };
  return api;
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  locale,
  t
});
