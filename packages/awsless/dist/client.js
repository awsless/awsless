import {
  createProxy
} from "./chunk-2LRBH7VV.js";

// src/lib/client/auth.ts
import { constantCase } from "change-case";

// src/lib/client/util.ts
var getBindEnv = (name) => {
  return import.meta.env[name];
};

// src/lib/client/auth.ts
var Auth = /* @__PURE__ */ createProxy((name) => {
  return getAuthProps(name);
});
var getAuthProps = (name) => {
  const id = constantCase(name);
  return {
    userPoolId: getBindEnv(`AUTH_${id}_USER_POOL_ID`),
    clientId: getBindEnv(`AUTH_${id}_CLIENT_ID`)
  };
};

// src/lib/client/http.ts
var createHttpFetcher = (host) => {
  return async ({ method, path, headers, body, query }) => {
    const url = new URL(host, path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    headers.set("content-type", "application/json");
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    const result = await response.json();
    return result;
  };
};
var createHttpClient = (fetcher) => {
  const fetch2 = (method, routeKey, props) => {
    const path = routeKey.replaceAll(/{([a-z0-1-]+)}/, (key) => {
      return props?.params?.[key.substring(1, key.length - 1)]?.toString() ?? "";
    });
    return fetcher({
      headers: new Headers(props?.headers),
      query: props?.query,
      body: props?.body,
      method,
      path
    });
  };
  return {
    fetch: fetch2,
    get(routeKey, props) {
      return fetch2("GET", routeKey, props);
    },
    post(routeKey, props) {
      return fetch2("POST", routeKey, props);
    }
  };
};

// src/lib/client/pubsub.ts
import { parse, stringify } from "@awsless/json";
import { createClient } from "@awsless/mqtt";
var createPubSubClient = (app, props, debug) => {
  const mqtt = createClient(async () => {
    const config = typeof props === "function" ? await props() : props;
    return {
      endpoint: `wss://${config.endpoint}/mqtt`,
      username: `?x-amz-customauthorizer-name=${config.authorizer}`,
      password: config.token
    };
  }, debug);
  const getApp = () => {
    return typeof app === "string" ? app : app();
  };
  const getPubSubTopic = (name) => {
    return `${getApp()}/pubsub/${name}`;
  };
  const fromPubSubTopic = (name) => {
    return name.replace(`${getApp()}/pubsub/`, "");
  };
  return {
    ...mqtt,
    get connected() {
      return mqtt.connected;
    },
    get topics() {
      return mqtt.topics.map(fromPubSubTopic);
    },
    publish(topic, event, payload, qos) {
      return mqtt.publish(getPubSubTopic(topic), stringify([event, payload]), qos);
    },
    subscribe(topic, event, callback) {
      return mqtt.subscribe(getPubSubTopic(topic), (message) => {
        const [eventName, payload] = parse(message.toString("utf8"));
        if (event === eventName) {
          callback(payload);
        }
      });
    }
  };
};
export {
  Auth,
  createHttpClient,
  createHttpFetcher,
  createPubSubClient,
  getAuthProps
};
