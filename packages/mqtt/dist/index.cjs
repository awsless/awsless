"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  QoS: () => QoS,
  createClient: () => createClient
});
module.exports = __toCommonJS(src_exports);
var import_mqtt = __toESM(require("mqtt"), 1);
var QoS = /* @__PURE__ */ ((QoS2) => {
  QoS2[QoS2["AtMostOnce"] = 0] = "AtMostOnce";
  QoS2[QoS2["AtLeastOnce"] = 1] = "AtLeastOnce";
  QoS2[QoS2["ExactlyOnce"] = 2] = "ExactlyOnce";
  return QoS2;
})(QoS || {});
var sleep = (delay) => new Promise((r) => setTimeout(r, delay));
var createClient = (propsOrProvider) => {
  const listeners = {};
  const queue = /* @__PURE__ */ new Set();
  let connecting = false;
  let client;
  const disconnect = async () => {
    if (client) {
      client.removeAllListeners();
      await client.endAsync();
      client = void 0;
    }
  };
  const connect = async () => {
    if (connecting || client)
      return;
    if (queue.size === 0 && Object.keys(listeners).length === 0)
      return;
    connecting = true;
    const props = typeof propsOrProvider === "function" ? await propsOrProvider() : propsOrProvider;
    const local = client = await import_mqtt.default.connectAsync(props.endpoint, {
      ...props,
      reconnectPeriod: 0,
      resubscribe: false
    });
    local.on("disconnect", async () => {
      await disconnect();
      await sleep(1e3);
      await connect();
    });
    local.on("message", (topic, payload) => {
      const list = listeners[topic];
      if (list) {
        for (const entry of list) {
          entry.callback(payload);
        }
      }
    });
    await local.subscribeAsync(Object.keys(listeners), { qos: 1 /* AtLeastOnce */ });
    await Promise.all([
      ...[...queue].map(async (msg) => {
        await local.publishAsync(msg.topic, msg.payload, { qos: msg.qos });
        queue.delete(msg);
      })
    ]);
    connecting = false;
  };
  return {
    // onChange() {},
    get connected() {
      return client?.connected ?? false;
    },
    get topics() {
      return Object.keys(listeners);
    },
    async destroy() {
      await disconnect();
    },
    async publish(topic, payload, qos = 0 /* AtMostOnce */) {
      if (client) {
        await client.publishAsync(topic, payload, { qos });
      } else {
        queue.add({ topic, payload, qos });
        await connect();
      }
    },
    async subscribe(topic, callback) {
      const listener = { callback };
      const list = listeners[topic] = listeners[topic] ?? /* @__PURE__ */ new Set();
      list.add(listener);
      if (client) {
        if (list.size === 1) {
          await client.subscribeAsync(topic, { qos: 1 /* AtLeastOnce */ });
        }
      } else {
        await connect();
      }
      return async () => {
        list.delete(listener);
        if (list.size === 0) {
          delete listeners[topic];
          await client?.unsubscribeAsync(topic, { qos: 1 /* AtLeastOnce */ });
        }
        if (Object.keys(listeners).length === 0) {
          await disconnect();
        }
      };
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QoS,
  createClient
});
