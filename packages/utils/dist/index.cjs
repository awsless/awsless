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
  globalClient: () => globalClient,
  mockFn: () => mockFn,
  mockObjectValues: () => mockObjectValues,
  nextTick: () => nextTick
});
module.exports = __toCommonJS(src_exports);

// src/client.ts
var globalClient = (factory) => {
  let singleton;
  const getter = () => {
    if (!singleton) {
      singleton = factory();
    }
    return singleton;
  };
  getter.set = (client) => {
    singleton = client;
  };
  return getter;
};

// src/mock.ts
var mockObjectValues = (object) => {
  const list = {};
  Object.entries(object).forEach(([key, value]) => {
    list[key] = mockFn(value);
  });
  return Object.freeze(list);
};
var mockFn = (fn) => {
  return vi ? vi.fn(fn) : fn;
};
var nextTick = (fn, ...args) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn(...args));
    }, 0);
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  globalClient,
  mockFn,
  mockObjectValues,
  nextTick
});
