// src/client.ts
import { SSMClient } from "@aws-sdk/client-ssm";
import { globalClient } from "@awsless/utils";
var ssmClient = globalClient(() => {
  return new SSMClient({});
});

// src/ssm.ts
import { GetParametersCommand } from "@aws-sdk/client-ssm";
import chunk from "chunk";
var formatPath = (path) => {
  return path[0] !== "/" ? `/${path}` : path;
};
var cache = {};
var ssm = async (paths, { client = ssmClient(), ttl = 0 } = {}) => {
  const now = Math.floor(Date.now() / 1e3);
  const values = {};
  const list = Object.entries(paths).map(([key, path]) => {
    if (typeof path === "string") {
      return {
        key,
        path: formatPath(path),
        transform: (v) => v
      };
    }
    return {
      key,
      path: formatPath(path.path),
      transform: path.transform
    };
  }).filter(({ key, path, transform }) => {
    const item = cache[path];
    if (item && item.ttl > now) {
      values[key] = transform(cache[path].value);
      return false;
    }
    return true;
  });
  await Promise.all(
    chunk(list, 10).map(async (list2) => {
      const names = [...new Set(list2.map((item) => item.path))];
      const command = new GetParametersCommand({
        Names: names,
        WithDecryption: true
      });
      const result = await client.send(command);
      if (result.InvalidParameters && result.InvalidParameters.length) {
        throw new Error(`SSM parameter(s) not found - ['${result.InvalidParameters.join(`', '`)}']`);
      }
      result.Parameters?.forEach(({ Name: path, Value: value }) => {
        if (typeof value === "string" && typeof path === "string") {
          if (ttl > 0) {
            cache[path] = { value, ttl: now + ttl };
          }
          list2.forEach((item) => {
            if (path === item.path) {
              values[item.key] = item.transform(value);
            }
          });
        }
      });
    })
  );
  return values;
};

// src/values.ts
var string = (path) => {
  return path;
};
var float = (path) => {
  return {
    path,
    transform(value) {
      return parseFloat(value);
    }
  };
};
var integer = (path, radix = 10) => {
  return {
    path,
    transform(value) {
      return parseInt(value, radix);
    }
  };
};
var array = (path, seperator = ",") => {
  return {
    path,
    transform(value) {
      return value.split(seperator).map((v) => v.trim());
    }
  };
};
var json = (path) => {
  return {
    path,
    transform(value) {
      return JSON.parse(value);
    }
  };
};

// src/mock.ts
import { SSMClient as SSMClient2, GetParametersCommand as GetParametersCommand2 } from "@aws-sdk/client-ssm";
import { mockClient } from "aws-sdk-client-mock";
import { nextTick, mockFn } from "@awsless/utils";
var mockSSM = (values) => {
  const mock = mockFn(() => {
  });
  mockClient(SSMClient2).on(GetParametersCommand2).callsFake(async (input) => {
    await nextTick(mock);
    return {
      Parameters: (input.Names || []).map((name) => {
        return {
          Name: name,
          Value: values[name] || ""
        };
      })
    };
  });
  beforeEach && beforeEach(() => {
    mock.mockClear();
  });
  return mock;
};
export {
  array,
  float,
  integer,
  json,
  mockSSM,
  ssm,
  ssmClient,
  string
};
