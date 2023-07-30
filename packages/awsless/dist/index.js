import {
  definePlugin
} from "./chunk-PFTL6L4F.js";

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
export {
  definePlugin,
  getFunctionName,
  getQueueName,
  getResourceName,
  getStoreName,
  getTableName
};
