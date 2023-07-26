import {
  definePlugin
} from "./chunk-PFTL6L4F.js";

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
export {
  Queue,
  Store,
  Table,
  definePlugin,
  getResourceName,
  getResourceProxy
};
