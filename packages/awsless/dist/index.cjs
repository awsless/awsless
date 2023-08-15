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
  defineAppConfig: () => defineAppConfig,
  definePlugin: () => definePlugin,
  getFunctionName: () => getFunctionName,
  getGlobalResourceName: () => getGlobalResourceName,
  getLocalResourceName: () => getLocalResourceName,
  getQueueName: () => getQueueName,
  getStoreName: () => getStoreName,
  getTableName: () => getTableName,
  getTopicName: () => getTopicName
});
module.exports = __toCommonJS(src_exports);

// src/plugin.ts
var definePlugin = (plugin) => plugin;

// src/node/resource.ts
var APP = process.env.APP || "app";
var STACK = process.env.STACK || "stack";
var getLocalResourceName = (id, stack = STACK) => {
  return `${APP}-${stack}-${id}`;
};
var getGlobalResourceName = (id) => {
  return `${APP}-${id}`;
};
var getFunctionName = getLocalResourceName;
var getTableName = getLocalResourceName;
var getStoreName = getLocalResourceName;
var getQueueName = getLocalResourceName;
var getTopicName = getGlobalResourceName;

// src/index.ts
var defineAppConfig = (config) => {
  return config;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineAppConfig,
  definePlugin,
  getFunctionName,
  getGlobalResourceName,
  getLocalResourceName,
  getQueueName,
  getStoreName,
  getTableName,
  getTopicName
});
