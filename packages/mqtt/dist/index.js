// src/index.ts
import mqtt from "mqtt";
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
    const local = client = await mqtt.connectAsync(props.endpoint, {
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
export {
  QoS,
  createClient
};
