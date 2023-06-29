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
  SSMClient: () => import_client_ssm5.SSMClient,
  array: () => array,
  float: () => float,
  integer: () => integer,
  json: () => json,
  mockSSM: () => mockSSM,
  putParameter: () => putParameter,
  ssm: () => ssm,
  ssmClient: () => ssmClient,
  string: () => string
});
module.exports = __toCommonJS(src_exports);
var import_client_ssm5 = require("@aws-sdk/client-ssm");

// src/client.ts
var import_client_ssm = require("@aws-sdk/client-ssm");
var import_utils = require("@awsless/utils");
var ssmClient = (0, import_utils.globalClient)(() => {
  return new import_client_ssm.SSMClient({});
});

// src/ssm.ts
var import_client_ssm2 = require("@aws-sdk/client-ssm");
var import_chunk = __toESM(require("chunk"), 1);
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
    (0, import_chunk.default)(list, 10).map(async (list2) => {
      const names = [...new Set(list2.map((item) => item.path))];
      const command = new import_client_ssm2.GetParametersCommand({
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

// src/commands.ts
var import_client_ssm3 = require("@aws-sdk/client-ssm");
var putParameter = ({ client = ssmClient(), name, value, type = "String" }) => {
  const command = new import_client_ssm3.PutParameterCommand({
    Name: name,
    Value: value,
    Type: type,
    Overwrite: true,
    Tier: "Standard"
  });
  return client.send(command);
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
var import_client_ssm4 = require("@aws-sdk/client-ssm");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var import_utils2 = require("@awsless/utils");
var mockSSM = (values) => {
  const mock = (0, import_utils2.mockFn)(() => {
  });
  (0, import_aws_sdk_client_mock.mockClient)(import_client_ssm4.SSMClient).on(import_client_ssm4.GetParametersCommand).callsFake(async (input) => {
    await (0, import_utils2.nextTick)(mock);
    return {
      Parameters: (input.Names || []).map((name) => {
        return {
          Name: name,
          Value: values[name] || ""
        };
      })
    };
  }).on(import_client_ssm4.PutParameterCommand).callsFake(async () => {
    await (0, import_utils2.nextTick)(mock);
    return {};
  });
  beforeEach && beforeEach(() => {
    mock.mockClear();
  });
  return mock;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SSMClient,
  array,
  float,
  integer,
  json,
  mockSSM,
  putParameter,
  ssm,
  ssmClient,
  string
});
