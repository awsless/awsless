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
  let client;
  let destroyed = false;
  let connecting;
  let reconnecting;
  const disconnect = async () => {
    if (client) {
      const old = client;
      client = void 0;
      old.removeAllListeners();
      await old.endAsync(true).catch(() => {
      });
    }
  };
  const scheduleReconnect = () => {
    if (destroyed) return;
    reconnecting ??= (async () => {
      await sleep(1e3);
      reconnecting = void 0;
      await connect();
    })();
    return reconnecting;
  };
  const connect = () => {
    if (client || destroyed) return;
    if (queue.size === 0 && Object.keys(listeners).length === 0) return;
    connecting ??= (async () => {
      try {
        const props = typeof propsOrProvider === "function" ? await propsOrProvider() : propsOrProvider;
        const local = await mqtt.connectAsync(props.endpoint, {
          ...props,
          reconnectPeriod: 0,
          resubscribe: false
        });
        client = local;
        if (destroyed) {
          await disconnect();
          return;
        }
        local.on("disconnect", async () => {
          await disconnect();
          scheduleReconnect();
        });
        local.on("close", () => {
          if (client === local) {
            client = void 0;
          }
          scheduleReconnect();
        });
        local.on("error", () => {
        });
        local.on("message", (topic, payload) => {
          const entry = listeners[topic];
          if (entry) {
            for (const listener of entry.callbacks) {
              listener.callback(payload);
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
      } catch {
        client = void 0;
        scheduleReconnect();
      } finally {
        connecting = void 0;
      }
    })();
    return connecting;
  };
  return {
    get connected() {
      return client?.connected ?? false;
    },
    get topics() {
      return Object.keys(listeners);
    },
    async destroy() {
      destroyed = true;
      reconnecting = void 0;
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
    async subscribe(topic, callback, qos = 0 /* AtMostOnce */) {
      const listener = { callback };
      const entry = listeners[topic] = listeners[topic] ?? { qos, callbacks: /* @__PURE__ */ new Set() };
      entry.callbacks.add(listener);
      if (client) {
        if (entry.callbacks.size === 1) {
          await client.subscribeAsync(topic, { qos });
        }
      } else {
        await connect();
      }
      return async () => {
        entry.callbacks.delete(listener);
        if (entry.callbacks.size === 0) {
          delete listeners[topic];
          await client?.unsubscribeAsync(topic);
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
