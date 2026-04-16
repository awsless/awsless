import {
  createProxy
} from "./chunk-2LRBH7VV.js";

// src/lib/mock/job.ts
import { mockEcs } from "@awsless/ecs";

// src/lib/server/job.ts
import { runTask } from "@awsless/ecs";
import { stringify } from "@awsless/json";
import { putObject } from "@awsless/s3";
import { kebabCase as kebabCase2 } from "change-case";
import { randomUUID } from "crypto";

// src/lib/server/util.ts
import { kebabCase } from "change-case";
var APP = process.env.APP ?? "app";
var APP_ID = process.env.APP_ID ?? "app-id";
var STACK = process.env.STACK ?? "stack";
var IS_TEST = process.env.NODE_ENV === "test";
var REGION = process.env.AWS_REGION;
var ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
var build = (opt) => {
  return [
    //
    opt?.prefix,
    APP,
    opt.stackName,
    opt.resourceType,
    opt.resourceName,
    opt?.postfix
  ].filter((v) => typeof v === "string").map((v) => kebabCase(v)).join(opt.seperator ?? "--");
};
var bindPostfixedLocalResourceName = (resourceType, postfix) => {
  return (resourceName, stackName = STACK) => {
    return build({
      stackName,
      resourceName,
      resourceType,
      postfix
    });
  };
};
var bindLocalResourceName = (resourceType) => {
  return (resourceName, stackName = STACK) => {
    return build({
      stackName,
      resourceType,
      resourceName
    });
  };
};
var bindGlobalResourceName = (resourceType) => {
  return (resourceName) => {
    return build({
      resourceType,
      resourceName
    });
  };
};

// src/lib/server/job.ts
var getJobName = bindLocalResourceName("job");
var Job = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((jobName) => {
    const name = getJobName(jobName, stackName);
    const ctx = {
      [name]: async (payload) => {
        const cluster = `${APP}-job`;
        if (!process.env.JOB_SUBNETS) throw new Error("JOB_SUBNETS env var is not set. Is the job feature deployed?");
        if (!process.env.JOB_SECURITY_GROUP) throw new Error("JOB_SECURITY_GROUP env var is not set. Is the job feature deployed?");
        const subnets = JSON.parse(process.env.JOB_SUBNETS);
        const securityGroup = process.env.JOB_SECURITY_GROUP;
        let storedPayload = payload;
        const bucket = process.env.JOB_PAYLOAD_BUCKET;
        if (payload !== void 0 && bucket) {
          const key = `payloads/${randomUUID()}.json`;
          await putObject({ bucket, key, body: stringify(payload), contentType: "application/json" });
          storedPayload = `s3://${bucket}/${key}`;
        }
        return runTask({
          cluster,
          taskDefinition: name,
          subnets,
          securityGroups: [securityGroup],
          container: `container-${kebabCase2(jobName)}`,
          payload: storedPayload
        });
      }
    };
    return ctx[name];
  });
});

// src/lib/mock/job.ts
var mockJob = (cb) => {
  process.env.JOB_SUBNETS = JSON.stringify(["mock-subnet"]);
  process.env.JOB_SECURITY_GROUP = "mock-sg";
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle = () => {
      }) => {
        list[getJobName(name, stack)] = handle;
      };
    });
  });
  cb(mock);
  const mocks = mockEcs(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return mocks[getJobName(name, stack)];
    });
  });
};

// src/lib/mock/alert.ts
import { mockSNS } from "@awsless/sns";

// src/lib/server/alert.ts
import { stringify as stringify2 } from "@awsless/json";
import { publish } from "@awsless/sns";
var getAlertName = bindGlobalResourceName("alert");
var Alert = /* @__PURE__ */ createProxy((name) => {
  const topic = getAlertName(name);
  const ctx = {
    [topic]: async (subject, payload, options = {}) => {
      await publish({
        ...options,
        topic,
        subject,
        payload: typeof payload === "string" || typeof payload === "undefined" ? payload : stringify2(payload)
      });
    }
  };
  const call = ctx[topic];
  return call;
});

// src/lib/mock/alert.ts
var mockAlert = (cb) => {
  const list = {};
  const mock = createProxy((name) => {
    return (handle) => {
      list[getAlertName(name)] = handle ?? (() => {
      });
    };
  });
  cb(mock);
  const result = mockSNS(list);
  return createProxy((name) => {
    return result[getAlertName(name)];
  });
};

// src/lib/mock/cache.ts
import { mockRedis } from "@awsless/redis";
var mockCache = () => {
  return mockRedis();
};

// src/lib/mock/function.ts
import { mockLambda } from "@awsless/lambda";

// src/lib/server/function.ts
import { stringify as stringify3 } from "@awsless/json";
import { invoke } from "@awsless/lambda";
import { WeakCache } from "@awsless/weak-cache";
var cache = new WeakCache();
var getFunctionName = bindLocalResourceName("function");
var Fn = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((funcName) => {
    const name = getFunctionName(funcName, stackName);
    const ctx = {
      [name]: (payload, options = {}) => {
        if (!options.cache) {
          return invoke({
            ...options,
            name,
            payload
          });
        }
        const cacheKey = stringify3([name, payload, options.qualifier]);
        if (!cache.has(cacheKey)) {
          const promise = invoke({
            ...options,
            name,
            payload
          });
          cache.set(cacheKey, promise);
        }
        return cache.get(cacheKey);
      }
    };
    const call = ctx[name];
    call.cached = (payload, options = {}) => {
      const cacheKey = JSON.stringify({ name, payload, options });
      if (!cache.has(cacheKey)) {
        const promise = invoke({
          ...options,
          name,
          payload
        });
        cache.set(cacheKey, promise);
      }
      return cache.get(cacheKey);
    };
    return call;
  });
});

// src/lib/mock/function.ts
var mockFunction = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handleOrResponse) => {
        const handle = typeof handleOrResponse === "function" ? handleOrResponse : () => handleOrResponse;
        list[getFunctionName(name, stack)] = handle;
      };
    });
  });
  cb(mock);
  const result = mockLambda(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return result[getFunctionName(name, stack)];
    });
  });
};

// src/lib/mock/metric.ts
import { mockCloudWatch } from "@awsless/cloudwatch";
var mockMetric = () => {
  return mockCloudWatch();
};

// src/lib/mock/pubsub.ts
import { mockIoT } from "@awsless/iot";
var mockPubSub = () => {
  return mockIoT();
};

// src/lib/mock/queue.ts
import { mockSQS } from "@awsless/sqs";

// src/lib/server/queue.ts
import { sendMessage, sendMessageBatch } from "@awsless/sqs";
import { constantCase } from "change-case";
var getQueueName = bindLocalResourceName("queue");
var getQueueUrl = (name, stack = STACK) => {
  return process.env[`QUEUE_${constantCase(stack)}_${constantCase(name)}_URL`];
};
var Queue = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((queue) => {
    const url = getQueueUrl(queue, stack);
    const name = getQueueName(queue, stack);
    const ctx = {
      [name]: (payload, options = {}) => {
        return sendMessage({
          ...options,
          queue: url ?? name,
          payload,
          attributes: {
            ...options.attributes ?? {},
            ...url ? { queueUrl: url } : {},
            queueName: name
          }
        });
      }
    };
    const send = ctx[name];
    send.url = url;
    send.batch = (items, options = {}) => {
      return sendMessageBatch({
        ...options,
        queue: url ?? name,
        items: items.map((item) => ({
          ...item,
          attributes: {
            ...item.attributes ?? {},
            ...url ? { queueUrl: url } : {},
            queueName: name
          }
        }))
      });
    };
    return send;
  });
});

// src/lib/mock/queue.ts
var mockQueue = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle) => {
        list[getQueueName(name, stack)] = handle ?? (() => {
        });
      };
    });
  });
  cb(mock);
  const result = mockSQS(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return result[getQueueName(name, stack)];
    });
  });
};

// src/lib/mock/task.ts
import { mockLambda as mockLambda2 } from "@awsless/lambda";
import { mockScheduler } from "@awsless/scheduler";

// src/lib/server/task.ts
import { invoke as invoke2 } from "@awsless/lambda";
import { schedule } from "@awsless/scheduler";

// src/lib/server/on-failure.ts
var onFailureBucketName = build({
  resourceType: "on-failure",
  resourceName: "failure",
  postfix: APP_ID
});
var onFailureQueueName = build({
  resourceType: "on-failure",
  resourceName: "failure"
});
var onFailureBucketArn = `arn:aws:s3:::${onFailureBucketName}`;
var onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueueName}`;

// src/lib/server/task.ts
var getTaskName = bindLocalResourceName("task");
var Task = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((taskName) => {
    const name = getTaskName(taskName, stackName);
    const ctx = {
      [name]: async (payload, options = {}) => {
        if (options.schedule) {
          const resourceTaskName = bindGlobalResourceName("task");
          await schedule({
            name,
            payload,
            schedule: options.schedule,
            group: resourceTaskName("group"),
            roleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${resourceTaskName("schedule")}`,
            deadLetterArn: onFailureQueueArn
          });
        } else {
          await invoke2({
            ...options,
            type: "Event",
            name,
            payload
          });
        }
      }
    };
    return ctx[name];
  });
});

// src/lib/mock/task.ts
var mockTask = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle) => {
        list[getTaskName(name, stack)] = vi.fn(handle);
      };
    });
  });
  cb(mock);
  mockLambda2(list);
  mockScheduler(list);
  beforeEach && beforeEach(() => {
    for (const item of Object.values(list)) {
      item.mockClear();
    }
  });
  return createProxy((stack) => {
    return createProxy((name) => {
      return list[getTaskName(name, stack)];
    });
  });
};

// src/lib/mock/topic.ts
import { mockSNS as mockSNS2 } from "@awsless/sns";

// src/lib/server/topic.ts
import { stringify as stringify4 } from "@awsless/json";
import { publish as publish2 } from "@awsless/sns";
var getTopicName = bindGlobalResourceName("topic");
var Topic = /* @__PURE__ */ createProxy((name) => {
  const topic = getTopicName(name);
  const ctx = {
    [topic]: async (payload, options = {}) => {
      await publish2({
        ...options,
        topic,
        payload: stringify4(payload)
      });
    }
  };
  const call = ctx[topic];
  return call;
});

// src/lib/mock/topic.ts
var mockTopic = (cb) => {
  const list = {};
  const mock = createProxy((name) => {
    return (handle) => {
      list[getTopicName(name)] = handle ?? (() => {
      });
    };
  });
  cb(mock);
  const result = mockSNS2(list);
  return createProxy((name) => {
    return result[getTopicName(name)];
  });
};

// src/lib/server/auth.ts
import { constantCase as constantCase2 } from "change-case";
var getAuthProps = (name) => {
  return {
    userPoolId: process.env[`AUTH_${constantCase2(name)}_USER_POOL_ID`],
    clientId: process.env[`AUTH_${constantCase2(name)}_CLIENT_ID`]
  };
};
var Auth = /* @__PURE__ */ createProxy((name) => {
  const { userPoolId, clientId } = getAuthProps(name);
  return {
    userPoolId,
    clientId
    // async listUsers(limit: number, filter?: string) {
    // 	return client.send(
    // 		new ListUsersCommand({
    // 			UserPoolId: userPoolId,
    // 			Limit: limit,
    // 			Filter: filter,
    // 		})
    // 	)
    // },
  };
});

// src/lib/server/cache.ts
import { command } from "@awsless/redis";
import { constantCase as constantCase3 } from "change-case";
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
          tls: {
            checkServerIdentity: () => {
              return void 0;
            }
          },
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

// src/lib/server/config.ts
import { ssm } from "@awsless/ssm";
import { kebabCase as kebabCase3 } from "change-case";
var getConfigName = (name) => {
  return `/.awsless/${APP}/${kebabCase3(name)}`;
};
var loadConfigData = /* @__NO_SIDE_EFFECTS__ */ async () => {
  if (!IS_TEST) {
    const keys = [];
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("CONFIG_")) {
        keys.push(process.env[key]);
      }
    }
    if (keys.length > 0) {
      const paths = {};
      for (const key of keys) {
        paths[kebabCase3(key)] = getConfigName(key);
      }
      return ssm(paths);
    }
  }
  return {};
};
var data = await /* @__PURE__ */ loadConfigData();
var getConfigValue = (name) => {
  const key = kebabCase3(name);
  const value = data[key];
  if (typeof value === "undefined") {
    throw new Error(
      `The "${name}" config value hasn't been set yet. ${IS_TEST ? `Use "Config.${name} = 'VAlUE'" to define your mock value.` : `Define access to the desired config value inside your awsless stack file.`}`
    );
  }
  return value;
};
var setConfigValue = (name, value) => {
  const key = kebabCase3(name);
  data[key] = value;
};
var Config = /* @__PURE__ */ new Proxy(
  {},
  {
    get(_, name) {
      return getConfigValue(name);
    },
    set(_, name, value) {
      setConfigValue(name, value);
      return true;
    }
  }
);

// src/lib/server/cron.ts
import { invoke as invoke3 } from "@awsless/lambda";
var getCronName = bindLocalResourceName("cron");
var Cron = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((taskName) => {
    const name = getCronName(taskName, stackName);
    const ctx = {
      [name]: async (payload, options = {}) => {
        await invoke3({
          ...options,
          type: "Event",
          name,
          payload
        });
      }
    };
    return ctx[name];
  });
});

// src/lib/server/metric.ts
import {
  batchPutData,
  createDurationMetric,
  createMetric,
  createSizeMetric,
  putData
} from "@awsless/cloudwatch";
import { constantCase as constantCase4, kebabCase as kebabCase4 } from "change-case";
var getMetricName = (name) => {
  return kebabCase4(name);
};
var getMetricNamespace = (stack = STACK, app = APP) => {
  return `awsless/${kebabCase4(app)}/${kebabCase4(stack)}`;
};
var Metric = /* @__PURE__ */ createProxy((stack) => {
  if (stack === "batch") {
    return batchPutData;
  }
  return createProxy((metricName) => {
    const name = getMetricName(metricName);
    const namespace = getMetricNamespace(stack);
    const unit = process.env[`METRIC_${constantCase4(metricName)}`];
    let metric;
    if (!unit && !IS_TEST) {
      throw new TypeError(`Metric "${name}" isn't defined in your stack.`);
    } else if (!unit) {
      metric = createMetric({ name, namespace });
    } else {
      const factories = {
        number: createMetric,
        size: createSizeMetric,
        duration: createDurationMetric
      };
      metric = factories[unit]({
        name,
        namespace
      });
    }
    return {
      name,
      namespace,
      unit,
      put(value, options) {
        return putData(metric, value, options);
      }
    };
  });
});

// src/lib/server/on-error-log.ts
import {
  array,
  date,
  isoTimestamp,
  object,
  optional,
  picklist,
  pipe,
  string,
  transform,
  union,
  unknown
} from "@awsless/validate";
var onErrorLogSchema = object({
  hash: string(),
  requestId: string(),
  origin: string(),
  level: picklist(["warn", "error", "fatal"]),
  type: string(),
  message: string(),
  stackTrace: optional(array(string())),
  data: optional(unknown()),
  date: union([
    date(),
    pipe(
      string(),
      isoTimestamp(),
      transform((v) => new Date(v))
    )
  ])
});

// src/lib/server/pubsub.ts
import { hours, toSeconds } from "@awsless/duration";
import { publish as publish3, QoS } from "@awsless/iot";
import { stringify as stringify5 } from "@awsless/json";
var getPubSubTopic = (name) => {
  return `${APP}/pubsub/${name}`;
};
var PubSub = {
  async publish(topic, event, payload, opts = {}) {
    await publish3({
      topic: getPubSubTopic(topic),
      payload: Buffer.from(stringify5([event, payload])),
      ...opts
    });
  }
};
var pubsubAuthorizerHandle = async (cb) => {
  return async (event) => {
    const token = Buffer.from(event.protocolData.mqtt?.password ?? "", "base64").toString();
    const response = await cb(token);
    return pubsubAuthorizerResponse(response);
  };
};
var pubsubAuthorizerResponse = (props) => {
  const region = process.env.AWS_REGION;
  const accountId = process.env.AWS_ACCOUNT_ID;
  const prefix = `arn:aws:iot:${region}:${accountId}`;
  const statements = [];
  if (props.publish) {
    statements.push({
      Action: "iot:Publish",
      Effect: "Allow",
      Resource: props.publish.map((topic) => {
        return `${prefix}:topic/${getPubSubTopic(topic)}`;
      })
    });
  }
  if (props.subscribe) {
    statements.push(
      {
        Action: "iot:Subscribe",
        Effect: "Allow",
        Resource: props.subscribe.map((topic) => {
          return `${prefix}:topicfilter/${getPubSubTopic(topic)}`;
        })
      }
      // {
      // 	Action: 'iot:Receive',
      // 	Effect: 'Allow',
      // 	Resource: props.subscribe.map(topic => {
      // 		return `${prefix}:topic/${getPubSubTopic(topic)}`
      // 	}),
      // }
    );
  }
  const policyDocuments = [
    {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "iot:Connect",
          Effect: "Allow",
          Resource: "*"
          // Resource: `${prefix}:client/\${iot:ClientId}`,
        },
        {
          Action: "iot:Receive",
          Effect: "Allow",
          Resource: "*"
          // Resource: `${prefix}:client/\${iot:ClientId}`,
        },
        ...statements
      ]
    }
  ];
  const documentSize = JSON.stringify(policyDocuments).length;
  if (documentSize > 2048) {
    throw new Error(`IoT policy document size can't exceed 2048 characters. Current size is ${documentSize}`);
  }
  return {
    isAuthenticated: props.authorized,
    principalId: props.principalId ?? Date.now().toString(),
    disconnectAfterInSeconds: toSeconds(props.disconnectAfter ?? hours(1)),
    refreshAfterInSeconds: toSeconds(props.disconnectAfter ?? hours(1)),
    policyDocuments
  };
};

// src/lib/server/search.ts
import { define, searchClient } from "@awsless/open-search";
import { constantCase as constantCase5 } from "change-case";
var getSearchName = bindLocalResourceName("search");
var getSearchProps = (name, stack = STACK) => {
  return {
    domain: process.env[`SEARCH_${constantCase5(stack)}_${constantCase5(name)}_DOMAIN`]
  };
};
var Search = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const { domain } = getSearchProps(name, stack);
    let client;
    return {
      domain,
      defineTable(tableName, schema) {
        return define(tableName, schema, () => {
          if (!client) client = searchClient({ node: `https://${domain}` }, "es");
          return client;
        });
      }
    };
  });
});

// src/lib/server/site.ts
var getSiteBucketName = bindPostfixedLocalResourceName("site", APP_ID);

// src/lib/server/store.ts
import { deleteObject, getObject, headObject, putObject as putObject2 } from "@awsless/s3";
var getStoreName = bindPostfixedLocalResourceName("store", APP_ID);
var Store = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const bucket = getStoreName(name, stack);
    return {
      name: bucket,
      async put(key, body, options = {}) {
        await putObject2({
          bucket,
          key,
          body,
          ...options
        });
      },
      async get(key) {
        const object2 = await getObject({ bucket, key });
        if (object2) {
          return object2.body;
        }
        return void 0;
      },
      async has(key) {
        const object2 = await headObject({ bucket, key });
        return !!object2;
      },
      delete(key) {
        return deleteObject({ bucket, key });
      }
    };
  });
});

// src/lib/server/table.ts
var getTableName = bindLocalResourceName("table");
var Table = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    return getTableName(name, stack);
  });
});
export {
  APP,
  Alert,
  Auth,
  Cache,
  Config,
  Cron,
  Fn,
  Job,
  Metric,
  PubSub,
  QoS,
  Queue,
  STACK,
  Search,
  Store,
  Table,
  Task,
  Topic,
  getAlertName,
  getAuthProps,
  getCacheProps,
  getConfigName,
  getConfigValue,
  getCronName,
  getFunctionName,
  getJobName,
  getMetricName,
  getMetricNamespace,
  getPubSubTopic,
  getQueueName,
  getQueueUrl,
  getSearchName,
  getSearchProps,
  getSiteBucketName,
  getStoreName,
  getTableName,
  getTaskName,
  getTopicName,
  mockAlert,
  mockCache,
  mockFunction,
  mockJob,
  mockMetric,
  mockPubSub,
  mockQueue,
  mockTask,
  mockTopic,
  onErrorLogSchema,
  onFailureBucketArn,
  onFailureBucketName,
  onFailureQueueArn,
  onFailureQueueName,
  pubsubAuthorizerHandle,
  pubsubAuthorizerResponse,
  setConfigValue
};
