import {
  definePlugin
} from "./chunk-PFTL6L4F.js";

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
var defineStackConfig = (config) => {
  return config;
};
var defineAppConfig = (config) => {
  return config;
};
export {
  defineAppConfig,
  definePlugin,
  defineStackConfig,
  getFunctionName,
  getGlobalResourceName,
  getLocalResourceName,
  getQueueName,
  getStoreName,
  getTableName,
  getTopicName
};
