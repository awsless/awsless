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
  WeakCache: () => WeakCache
});
module.exports = __toCommonJS(src_exports);
var WeakCache = class {
  registry;
  cache;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.registry = new FinalizationRegistry((key) => {
      this.cache.delete(key);
    });
  }
  set(key, value) {
    const item = { value };
    const ref = new WeakRef(item);
    this.cache.set(key, ref);
    this.registry.register(item, key, ref);
    return this;
  }
  get(key, defaultValue) {
    const ref = this.cache.get(key);
    if (ref) {
      const item = ref.deref();
      if (typeof item !== "undefined") {
        return item.value;
      }
    }
    return defaultValue;
  }
  has(key) {
    return typeof this.get(key) !== "undefined";
  }
  delete(key) {
    const ref = this.cache.get(key);
    if (ref) {
      this.cache.delete(key);
      this.registry.unregister(ref);
      return true;
    }
    return false;
  }
  clear() {
    for (const key of this.keys()) {
      this.delete(key);
    }
  }
  get size() {
    return this.cache.size;
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  keys() {
    return this.cache.keys();
  }
  *values() {
    for (const ref of this.cache.values()) {
      const item = ref.deref();
      if (item) {
        yield item.value;
      }
    }
  }
  *entries() {
    for (const [key, ref] of this.cache.entries()) {
      const item = ref.deref();
      if (item) {
        yield [key, item.value];
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WeakCache
});
