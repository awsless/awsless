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
  APP: () => APP,
  Cache: () => Cache,
  Function: () => Function,
  Queue: () => Queue,
  STACK: () => STACK,
  Search: () => Search,
  Store: () => Store,
  Table: () => Table,
  Topic: () => Topic,
  defineAppConfig: () => defineAppConfig,
  definePlugin: () => definePlugin,
  defineStackConfig: () => defineStackConfig,
  getCacheProps: () => getCacheProps,
  getFunctionName: () => getFunctionName,
  getGlobalResourceName: () => getGlobalResourceName,
  getLocalResourceName: () => getLocalResourceName,
  getQueueName: () => getQueueName,
  getSearchName: () => getSearchName,
  getSecretName: () => getSecretName,
  getStoreName: () => getStoreName,
  getTableName: () => getTableName,
  getTopicName: () => getTopicName
});
module.exports = __toCommonJS(src_exports);

// src/plugin.ts
var definePlugin = (plugin) => plugin;

// src/node/resource.ts
var import_change_case = require("change-case");
var APP = process.env.APP || "app";
var STACK = process.env.STACK || "stack";
var getLocalResourceName = (name, stack = STACK) => {
  return `${APP}-${(0, import_change_case.paramCase)(stack)}-${(0, import_change_case.paramCase)(name)}`;
};
var getGlobalResourceName = (name) => {
  return `${APP}-${(0, import_change_case.paramCase)(name)}`;
};
var getSecretName = (name) => {
  return `/.awsless/${APP}/${name}`;
};

// src/node/function.ts
var import_lambda = require("@awsless/lambda");

// src/node/util.ts
var createProxy = (cb) => {
  const cache = /* @__PURE__ */ new Map();
  return new Proxy({}, {
    get(_, name) {
      if (!cache.has(name)) {
        cache.set(name, cb(name));
      }
      return cache.get(name);
    }
  });
};

// src/node/function.ts
var getFunctionName = (stack, name) => {
  return getLocalResourceName(name, stack);
};
var Function = createProxy((stackName) => {
  return createProxy((funcName) => {
    const name = getFunctionName(stackName, funcName);
    const call = (payload, options = {}) => {
      return (0, import_lambda.invoke)({
        ...options,
        name,
        payload
      });
    };
    call.name = name;
    call.async = (payload, options = {}) => {
      return (0, import_lambda.invoke)({
        ...options,
        type: "Event",
        name,
        payload
      });
    };
    return call;
  });
});

// src/node/table.ts
var getTableName = getLocalResourceName;
var Table = createProxy((stack) => {
  return createProxy((name) => {
    return {
      name: getTableName(name, stack)
    };
  });
});

// src/node/topic.ts
var import_sns = require("@awsless/sns");
var getTopicName = getGlobalResourceName;
var Topic = createProxy((topic) => {
  const name = getTopicName(topic);
  const call = (payload, options = {}) => {
    return (0, import_sns.publish)({
      ...options,
      topic: name,
      payload
    });
  };
  call.name = name;
  return call;
});

// src/node/queue.ts
var import_sqs = require("@awsless/sqs");
var import_change_case2 = require("change-case");
var getQueueName = getLocalResourceName;
var getQueueUrl = (name, stack = STACK) => {
  return process.env[`QUEUE_${(0, import_change_case2.constantCase)(stack)}_${(0, import_change_case2.constantCase)(name)}_URL`];
};
var Queue = createProxy((stack) => {
  return createProxy((queue) => {
    const url = getQueueUrl(queue, stack);
    const send = (payload, options = {}) => {
      return (0, import_sqs.sendMessage)({
        ...options,
        queue: url,
        payload
      });
    };
    send.url = url;
    send.name = getQueueName(queue, stack);
    send.batch = (items, options = {}) => {
      return (0, import_sqs.sendMessageBatch)({
        ...options,
        queue: url,
        items
      });
    };
    return send;
  });
});

// src/node/cache.ts
var import_change_case3 = require("change-case");
var getCacheProps = (name, stack = STACK) => {
  const prefix = `CACHE_${(0, import_change_case3.constantCase)(stack)}_${(0, import_change_case3.constantCase)(name)}`;
  return {
    host: process.env[`${prefix}_HOST`],
    port: parseInt(process.env[`${prefix}_PORT`], 10)
  };
};
var Cache = createProxy((stack) => {
  return createProxy((name) => {
    const call = () => {
    };
    const { host, port } = getCacheProps(name, stack);
    call.host = host;
    call.port = port;
    return call;
  });
});

// src/node/store.ts
var getStoreName = getLocalResourceName;
var Store = createProxy((stack) => {
  return createProxy((name) => {
    return {
      name: getStoreName(name, stack)
    };
  });
});

// src/node/search.ts
var getSearchName = getLocalResourceName;
var Search = createProxy((stack) => {
  return createProxy((name) => {
    return {
      name: getSearchName(name, stack)
    };
  });
});

// src/index.ts
var defineStackConfig = (config) => {
  return config;
};
var defineAppConfig = (config) => {
  return config;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APP,
  Cache,
  Function,
  Queue,
  STACK,
  Search,
  Store,
  Table,
  Topic,
  defineAppConfig,
  definePlugin,
  defineStackConfig,
  getCacheProps,
  getFunctionName,
  getGlobalResourceName,
  getLocalResourceName,
  getQueueName,
  getSearchName,
  getSecretName,
  getStoreName,
  getTableName,
  getTopicName
});
