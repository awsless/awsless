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
var createProxy = /* @__NO_SIDE_EFFECTS__ */ (cb) => {
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
var Function = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((funcName) => {
    const name = getFunctionName(stackName, funcName);
    const ctx = {
      [name]: (payload, options = {}) => {
        return invoke({
          ...options,
          name,
          payload
        });
      }
    };
    const call = ctx[name];
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
var Fn = Function;

// src/node/auth.ts
import { constantCase } from "change-case";
var getAuthName = getGlobalResourceName;
var Auth = /* @__PURE__ */ createProxy((name) => {
  return getAuthProps(name);
});
var getAuthProps = (name) => {
  const env = process.env;
  const id = constantCase(name);
  return {
    name: getAuthName(name),
    userPoolId: env[`AUTH_${id}_USER_POOL_ID`],
    clientId: env[`AUTH_${id}_CLIENT_ID`],
    clientSecret: env[`AUTH_${id}_CLIENT_SECRET`]
  };
};

// src/node/table.ts
var getTableName = getLocalResourceName;
var Table = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    return getTableName(name, stack);
  });
});

// src/node/topic.ts
import { publish } from "@awsless/sns";
var getTopicName = getGlobalResourceName;
var Topic = /* @__PURE__ */ createProxy((name) => {
  const topic2 = getTopicName(name);
  const ctx = {
    [topic2]: async (payload, options = {}) => {
      await publish({
        ...options,
        topic: topic2,
        payload
      });
    }
  };
  const call = ctx[topic2];
  return call;
});

// src/node/queue.ts
import {
  sendMessage,
  sendMessageBatch
} from "@awsless/sqs";
import { constantCase as constantCase2 } from "change-case";
var getQueueName = getLocalResourceName;
var getQueueUrl = (name, stack = STACK) => {
  return process.env[`QUEUE_${constantCase2(stack)}_${constantCase2(name)}_URL`];
};
var Queue = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((queue2) => {
    const url = getQueueUrl(queue2, stack);
    const name = getQueueName(queue2, stack);
    const ctx = {
      [name]: (payload, options = {}) => {
        return sendMessage({
          ...options,
          queue: url,
          payload
        });
      }
    };
    const send = ctx[name];
    send.url = url;
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
import { constantCase as constantCase3 } from "change-case";
import { command } from "@awsless/redis";
var getCacheProps = (name, stack = STACK) => {
  const prefix = `CACHE_${constantCase3(stack)}_${constantCase3(name)}`;
  return {
    host: process.env[`${prefix}_HOST`],
    port: parseInt(process.env[`${prefix}_PORT`], 10)
  };
};
var Cache = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const { host, port } = getCacheProps(name, stack);
    const call = (opts, fn) => {
      const overload = typeof opts === "function";
      const options = overload ? {} : opts;
      const callback = overload ? opts : fn;
      return command(
        {
          host,
          port,
          db: 0,
          cluster: true,
          ...options
        },
        callback
      );
    };
    call.host = host;
    call.port = port;
    return call;
  });
});

// src/node/store.ts
var getStoreName = getLocalResourceName;
var Store = /* @__PURE__ */ createProxy((stack) => {
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
var TEST = process.env.NODE_ENV === "test";
var CONFIGS = process.env.CONFIG;
var loadConfigData = /* @__NO_SIDE_EFFECTS__ */ async () => {
  if (!TEST && CONFIGS) {
    const keys = CONFIGS.split(",");
    if (keys.length > 0) {
      const paths = {};
      for (const key of keys) {
        paths[key] = getConfigName(key);
      }
      return ssm(paths);
    }
  }
  return {};
};
var data = await /* @__PURE__ */ loadConfigData();
var Config = /* @__PURE__ */ new Proxy(
  {},
  {
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
  }
);

// src/node/search.ts
var getSearchName = getLocalResourceName;
var Search = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    return {
      name: getSearchName(name, stack)
    };
  });
});

// src/node/handle/function.ts
import { lambda } from "@awsless/lambda";
var func = (props) => {
  return lambda(props);
};

// src/node/handle/topic.ts
import { snsTopic } from "@awsless/validate";
import { lambda as lambda2 } from "@awsless/lambda";
var topic = (props) => {
  return lambda2({
    logger: props.logger,
    schema: snsTopic(props.schema),
    handle: props.handle,
    logViewableErrors: true
  });
};

// src/node/handle/queue.ts
import { lambda as lambda3 } from "@awsless/lambda";
import { sqsQueue } from "@awsless/validate";
var queue = (props) => {
  return lambda3({
    logger: props.logger,
    schema: sqsQueue(props.schema),
    handle: props.handle,
    logViewableErrors: true
  });
};

// src/node/handle/cron.ts
import { lambda as lambda4 } from "@awsless/lambda";
var cron = (props) => {
  return lambda4({
    ...props,
    logViewableErrors: true
  });
};

// src/index.ts
var defineStackConfig = (config) => config;
var defineAppConfig = (config) => config;
export {
  APP,
  Auth,
  Cache,
  Config,
  Fn,
  Function,
  Queue,
  STACK,
  Search,
  Store,
  Table,
  Topic,
  cron,
  defineAppConfig,
  definePlugin,
  defineStackConfig,
  func,
  getAuthName,
  getAuthProps,
  getCacheProps,
  getConfigName,
  getFunctionName,
  getGlobalResourceName,
  getLocalResourceName,
  getQueueName,
  getSearchName,
  getStoreName,
  getTableName,
  getTopicName,
  queue,
  topic
};
