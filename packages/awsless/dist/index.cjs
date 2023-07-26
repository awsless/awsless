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
  Queue: () => Queue,
  Store: () => Store,
  Table: () => Table,
  definePlugin: () => definePlugin,
  getResourceName: () => getResourceName,
  getResourceProxy: () => getResourceProxy
});
module.exports = __toCommonJS(src_exports);

// src/plugin.ts
var definePlugin = (plugin) => plugin;

// src/node/resource.ts
var getResourceName = (type, id) => {
  const key = `RESOURCE_${type.toUpperCase()}_${id}`;
  const value = process.env[key];
  if (!value) {
    throw new TypeError(`Resource type: "${type}" id: "${id}" doesn't exist.`);
  }
  return value;
};
var getResourceProxy = (type) => {
  return new Proxy({}, {
    get(_, id) {
      return getResourceName(type, id);
    }
  });
};
var Table = getResourceProxy("TABLE");
var Queue = getResourceProxy("QUEUE");
var Store = getResourceProxy("STORE");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Queue,
  Store,
  Table,
  definePlugin,
  getResourceName,
  getResourceProxy
});
