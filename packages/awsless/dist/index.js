import {
  definePlugin
} from "./chunk-PFTL6L4F.js";

// src/node/resource.ts
import { paramCase } from "change-case";
var APP = process.env.APP || "app";
var STACK = process.env.STACK || "stack";
var STAGE = process.env.STAGE || "stage";
var getLocalResourceName = (name, stack = STACK) => {
  return `${APP}-${paramCase(stack)}-${paramCase(name)}`;
};
var getGlobalResourceName = (name) => {
  return `${APP}-${paramCase(name)}`;
};

// src/node/function.ts
import { invoke } from "@awsless/lambda";

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
      return invoke({
        ...options,
        name,
        payload
      });
    };
    call.name = name;
    call.async = (payload, options = {}) => {
      return invoke({
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
import { publish } from "@awsless/sns";
var getTopicName = getGlobalResourceName;
var Topic = createProxy((topic) => {
  const name = getTopicName(topic);
  const call = (payload, options = {}) => {
    return publish({
      ...options,
      topic: name,
      payload
    });
  };
  call.name = name;
  return call;
});

// src/node/queue.ts
import { sendMessage, sendMessageBatch } from "@awsless/sqs";
import { constantCase } from "change-case";
var getQueueName = getLocalResourceName;
var getQueueUrl = (name, stack = STACK) => {
  return process.env[`QUEUE_${constantCase(stack)}_${constantCase(name)}_URL`];
};
var Queue = createProxy((stack) => {
  return createProxy((queue) => {
    const url = getQueueUrl(queue, stack);
    const send = (payload, options = {}) => {
      return sendMessage({
        ...options,
        queue: url,
        payload
      });
    };
    send.url = url;
    send.name = getQueueName(queue, stack);
    send.batch = (items, options = {}) => {
      return sendMessageBatch({
        ...options,
        queue: url,
        items
      });
    };
    return send;
  });
});

// src/node/cache.ts
import { constantCase as constantCase2 } from "change-case";
var getCacheProps = (name, stack = STACK) => {
  const prefix = `CACHE_${constantCase2(stack)}_${constantCase2(name)}`;
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

// src/node/config.ts
import { ssm } from "@awsless/ssm";
import { paramCase as paramCase2 } from "change-case";
var getConfigName = (name) => {
  return `/.awsless/${APP}/${name}`;
};
var data = {};
var TEST = process.env.NODE_ENV === "test";
var CONFIGS = process.env.AWSLESS_CONFIG;
if (!TEST && CONFIGS) {
  const keys = CONFIGS.split(",");
  if (keys.length > 0) {
    const paths = {};
    for (const key of keys) {
      paths[key] = getConfigName(key);
    }
    data = await ssm(paths);
  }
}
var Config = new Proxy({}, {
  get(_, name) {
    const key = paramCase2(name);
    const value = data[key];
    if (typeof value === "undefined") {
      throw new Error(
        `The "${name}" config value hasn't been set yet. ${TEST ? `Use "Config.${name} = 'VAlUE'" to define your mock value.` : `Define access to the desired config value inside your awsless stack file.`}`
      );
    }
    return value;
  },
  set(_, name, value) {
    const key = paramCase2(name);
    data[key] = value;
    return true;
  }
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
export {
  APP,
  Cache,
  Config,
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
  getConfigName,
  getFunctionName,
  getGlobalResourceName,
  getLocalResourceName,
  getQueueName,
  getSearchName,
  getStoreName,
  getTableName,
  getTopicName
};
