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
  definePlugin: () => definePlugin,
  getFunctionName: () => getFunctionName,
  getQueueName: () => getQueueName,
  getResourceName: () => getResourceName,
  getStoreName: () => getStoreName,
  getTableName: () => getTableName
});
module.exports = __toCommonJS(src_exports);

// src/plugin.ts
var definePlugin = (plugin) => plugin;

// src/node/resource.ts
var getResourceName = (type, id, stack = process.env.STACK || "default") => {
  const key = `RESOURCE_${type.toUpperCase()}_${stack}_${id}`;
  const value = process.env[key];
  if (!value) {
    throw new TypeError(`Resource type: "${type}" stack: "${stack}" id: "${id}" doesn't exist.`);
  }
  return value;
};
var getFunctionName = (id, stack) => {
  return getResourceName("function", id, stack);
};
var getTableName = (id, stack) => {
  return getResourceName("table", id, stack);
};
var getQueueName = (id, stack) => {
  return getResourceName("queue", id, stack);
};
var getStoreName = (id, stack) => {
  return getResourceName("store", id, stack);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  definePlugin,
  getFunctionName,
  getQueueName,
  getResourceName,
  getStoreName,
  getTableName
});
