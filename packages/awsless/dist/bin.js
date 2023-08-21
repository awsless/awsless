#!/usr/bin/env node
import {
  definePlugin
} from "./chunk-PFTL6L4F.js";

// src/cli/program.ts
import { Command } from "commander";

// src/cli/style.ts
import chalk from "chalk";
var symbol = {
  info: "\u2139",
  success: "\u2714",
  warning: "\u26A0",
  question: "?",
  error: "\u2716",
  ellipsis: "\u2026",
  pointerSmall: "\u203A",
  // line: '─',
  pointer: "\u276F"
};
var style = {
  primary: chalk.bold.hex("#FF9000"),
  // title: chalk.white,
  normal: chalk.white,
  label: chalk.white.bold,
  placeholder: chalk.dim,
  link: chalk.cyan,
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  attr: chalk.yellow,
  cursor: chalk.bgWhite.blackBright
};

// src/cli/logger.ts
var queue = [];
var debugError = (error) => {
  queue.push({
    date: /* @__PURE__ */ new Date(),
    type: style.error.dim("error"),
    message: typeof error === "string" ? error : error instanceof Error ? style.error(error.message || "") : JSON.stringify(error)
  });
};
var debug = (...parts) => {
  queue.push({
    date: /* @__PURE__ */ new Date(),
    type: style.warning.dim("debug"),
    message: parts.map((part) => typeof part === "string" ? part : JSON.stringify(part)).join(" ")
  });
};
var flushDebug = () => {
  return queue.splice(0, queue.length);
};

// src/util/param.ts
import { DeleteParameterCommand, GetParameterCommand, GetParametersByPathCommand, ParameterType, PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
var configParameterPrefix = (config) => {
  return `/.awsless/${config.name}`;
};
var Params = class {
  constructor(config) {
    this.config = config;
    this.client = new SSMClient({
      credentials: config.credentials,
      region: config.region
    });
  }
  client;
  getName(name) {
    return `${configParameterPrefix(this.config)}/${name}`;
  }
  async get(name) {
    debug("Get remote config value");
    debug("Name:", style.info(name));
    let result;
    try {
      result = await this.client.send(new GetParameterCommand({
        Name: this.getName(name),
        WithDecryption: true
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "ParameterNotFound") {
        debug("Parameter not found");
        return;
      }
      throw error;
    }
    const value = result.Parameter?.Value;
    debug("Value:", style.info(value));
    debug("Done getting remote config value");
    return value;
  }
  async set(name, value) {
    debug("Save remote config value");
    debug("Name:", style.info(name));
    debug("Value:", style.info(value));
    await this.client.send(new PutParameterCommand({
      Type: ParameterType.STRING,
      Name: this.getName(name),
      Value: value,
      Overwrite: true
    }));
    debug("Done saving remote config value");
  }
  async delete(name) {
    debug("Delete remote config value");
    debug("Name:", style.info(name));
    try {
      await this.client.send(new DeleteParameterCommand({
        Name: this.getName(name)
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "ParameterNotFound") {
        debug("Remote config value was already deleted");
        return;
      }
      throw error;
    }
    debug("Done deleting remote config value");
  }
  async list() {
    debug("Load remote config values");
    const result = await this.client.send(new GetParametersByPathCommand({
      Path: configParameterPrefix(this.config),
      WithDecryption: true,
      MaxResults: 10,
      Recursive: true
    }));
    debug("Done loading remote config values");
    const values = {};
    result.Parameters?.forEach((param) => {
      const name = param.Name.substring(configParameterPrefix(this.config).length).substring(1);
      values[name] = param.Value || "";
    });
    return values;
  }
};

// src/formation/asset.ts
import { paramCase } from "change-case";
var Asset = class {
  constructor(type, id) {
    this.type = type;
    this.id = paramCase(id);
  }
  id;
};

// src/formation/util.ts
import { paramCase as paramCase2, pascalCase } from "change-case";
var ref = (logicalId) => {
  return { Ref: logicalId };
};
var sub = (value, params) => {
  if (params) {
    return { "Fn::Sub": [value, params] };
  }
  return { "Fn::Sub": value };
};
var getAtt = (logicalId, attr) => {
  return { "Fn::GetAtt": [logicalId, attr] };
};
var importValue = (name) => {
  return { "Fn::ImportValue": name };
};
var formatLogicalId = (id) => {
  return pascalCase(id).replaceAll("_", "");
};
var formatName = (name) => {
  return paramCase2(name);
};

// src/formation/resource.ts
var Resource = class {
  constructor(type, logicalId, children = []) {
    this.type = type;
    this.children = children;
    this.logicalId = formatLogicalId(`${logicalId}-${type.replace(/^AWS::/, "")}`);
  }
  logicalId;
  deps = /* @__PURE__ */ new Set();
  dependsOn(...dependencies) {
    for (const dependency of dependencies) {
      this.deps.add(dependency);
    }
    return this;
  }
  attr(name, value) {
    if (typeof value === "undefined") {
      return {};
    }
    return {
      [name]: value
    };
  }
  toJSON() {
    return {
      [this.logicalId]: {
        Type: this.type,
        DependsOn: [...this.deps].map((dep) => dep.logicalId),
        Properties: this.properties()
      }
    };
  }
};
var Group = class {
  constructor(children) {
    this.children = children;
  }
};

// src/formation/resource/iam/inline-policy.ts
var InlinePolicy = class {
  constructor(name, props = {}) {
    this.name = name;
    this.statements = props.statements || [];
  }
  statements;
  addStatement(...statements) {
    this.statements.push(...statements.flat());
    return this;
  }
  toJSON() {
    return {
      PolicyName: this.name,
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: this.statements.map((statement) => ({
          Effect: statement.effect || "Allow",
          Action: statement.actions,
          Resource: statement.resources
        }))
      }
    };
  }
};

// src/formation/resource/iam/managed-policy.ts
var ManagedPolicy = class {
  constructor(arn) {
    this.arn = arn;
  }
  static fromAwsManagedPolicyName(name) {
    const arn = sub("arn:${AWS::Partition}:iam::aws:policy/service-role/" + name);
    return new ManagedPolicy(arn);
  }
  static fromManagedPolicyArn(arn) {
    return new ManagedPolicy(arn);
  }
};

// src/formation/resource/iam/role.ts
var Role = class extends Resource {
  constructor(logicalId, props = {}) {
    super("AWS::IAM::Role", logicalId);
    this.props = props;
    this.name = formatName(logicalId);
  }
  name;
  inlinePolicies = /* @__PURE__ */ new Set();
  managedPolicies = /* @__PURE__ */ new Set();
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  addManagedPolicy(...policies) {
    for (const policy of policies) {
      this.managedPolicies.add(policy);
    }
    return this;
  }
  addInlinePolicy(...policies) {
    for (const policy of policies) {
      this.inlinePolicies.add(policy);
    }
    return this;
  }
  properties() {
    return {
      ...this.props.assumedBy ? {
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: this.props.assumedBy
            }
          }]
        }
      } : {},
      ManagedPolicyArns: [...this.managedPolicies].map((policy) => policy.arn),
      Policies: [...this.inlinePolicies].map((policy) => policy.toJSON())
    };
  }
};

// src/formation/resource/lambda/function.ts
var Function = class extends Resource {
  constructor(logicalId, props) {
    const policy = new InlinePolicy(logicalId);
    const role = new Role(logicalId, {
      assumedBy: "lambda.amazonaws.com"
    });
    role.addInlinePolicy(policy);
    role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaBasicExecutionRole"));
    super("AWS::Lambda::Function", logicalId, [role]);
    this.props = props;
    if (props.code instanceof Asset) {
      this.children.push(props.code);
    }
    this.dependsOn(role);
    this.role = role;
    this.policy = policy;
    this.name = formatName(this.props.name || logicalId);
    this.environmentVariables = props.environment ? { ...props.environment } : {};
  }
  name;
  role;
  policy;
  environmentVariables;
  addPermissions(...permissions) {
    this.policy.addStatement(...permissions);
    return this;
  }
  addEnvironment(name, value) {
    this.environmentVariables[name] = value;
    return this;
  }
  get id() {
    return ref(this.logicalId);
  }
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  get permissions() {
    return {
      actions: [
        "lambda:InvokeFunction",
        "lambda:InvokeAsync"
      ],
      resources: [this.arn]
    };
  }
  properties() {
    return {
      FunctionName: this.name,
      MemorySize: this.props.memorySize?.toMegaBytes() ?? 128,
      Runtime: this.props.runtime ?? "nodejs18.x",
      Timeout: this.props.timeout?.toSeconds() ?? 10,
      Architectures: [this.props.architecture ?? "arm64"],
      Role: this.role.arn,
      ...this.attr("ReservedConcurrentExecutions", this.props.reserved),
      ...this.props.code.toCodeJson(),
      EphemeralStorage: {
        Size: this.props.ephemeralStorageSize?.toMegaBytes() ?? 512
      },
      Environment: {
        Variables: this.environmentVariables
      }
    };
  }
};

// src/formation/stack.ts
var Stack = class {
  constructor(name, region) {
    this.name = name;
    this.region = region;
  }
  exports = /* @__PURE__ */ new Map();
  resources = /* @__PURE__ */ new Set();
  tags = /* @__PURE__ */ new Map();
  assets = /* @__PURE__ */ new Set();
  add(...resources) {
    for (const item of resources) {
      if (item instanceof Asset) {
        this.assets.add(item);
      } else {
        this.add(...item.children);
        if (item instanceof Resource) {
          this.resources.add(item);
        }
      }
    }
    return this;
  }
  export(name, value) {
    this.exports.set(formatName(name), value);
    return this;
  }
  get(name) {
    name = formatName(name);
    if (!this.exports.has(name)) {
      throw new Error(`Undefined export value: ${name}`);
    }
    return this.exports.get(name);
  }
  import(name) {
    name = formatName(name);
    if (!this.exports.has(name)) {
      throw new Error(`Undefined export value: ${name}`);
    }
    return importValue(name);
  }
  tag(name, value) {
    this.tags.set(name, value);
    return this;
  }
  find(resourceType) {
    return [...this.resources].filter((resource) => resource instanceof resourceType);
  }
  [Symbol.iterator]() {
    return this.resources.values();
  }
  // get resources() {
  // 	return [ ...this.list.values() ]
  // }
  get size() {
    return this.resources.size;
  }
  toJSON() {
    const resources = {};
    const outputs = {};
    for (const resource of this) {
      Object.assign(resources, resource.toJSON());
    }
    for (const [name, value] of this.exports.entries()) {
      Object.assign(outputs, {
        [formatLogicalId(name)]: {
          Export: { Name: name },
          Value: value
        }
      });
    }
    return {
      Resources: resources,
      Outputs: outputs
    };
  }
  toString(pretty = false) {
    return JSON.stringify(
      this.toJSON(),
      void 0,
      pretty ? 4 : void 0
    );
  }
};

// src/stack.ts
var toStack = ({ config, app, stackConfig, bootstrap: bootstrap2, usEastBootstrap, plugins }) => {
  const name = stackConfig.name;
  const stack = new Stack(name, config.region).tag("app", config.name).tag("stage", config.stage).tag("stack", name);
  debug("Define stack:", style.info(name));
  debug("Run plugin onStack listeners");
  const bindings = [];
  const bind = (cb) => {
    bindings.push(cb);
  };
  for (const plugin of plugins) {
    plugin.onStack?.({
      config,
      app,
      stack,
      stackConfig,
      bootstrap: bootstrap2,
      usEastBootstrap,
      bind
    });
  }
  if (stack.size === 0) {
    throw new Error(`Stack ${style.info(name)} has no resources defined`);
  }
  const functions = stack.find(Function);
  for (const bind2 of bindings) {
    for (const fn of functions) {
      bind2(fn);
    }
  }
  for (const fn of functions) {
    fn.addPermissions({
      actions: [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      resources: [
        sub("arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:parameter" + configParameterPrefix(config))
      ]
    });
  }
  return {
    stack,
    depends: stackConfig.depends
  };
};

// src/util/deployment.ts
var createDependencyTree = (stacks) => {
  const list3 = stacks.map(({ stack, config }) => ({
    stack,
    depends: config?.depends?.map((dep) => dep.name) || []
  }));
  const findChildren = (list4, parents) => {
    const children = [];
    const rests = [];
    for (const item of list4) {
      const isChild = item.depends.filter((dep) => !parents.includes(dep)).length === 0;
      if (isChild) {
        children.push(item);
      } else {
        rests.push(item);
      }
    }
    if (!rests.length) {
      return children.map(({ stack }) => ({
        stack,
        children: []
      }));
    }
    return children.map(({ stack }) => {
      return {
        stack,
        children: findChildren(rests, [...parents, stack.name])
      };
    });
  };
  return findChildren(list3, []);
};
var createDeploymentLine = (stacks) => {
  const line = [];
  const walk = (stacks2, level) => {
    stacks2.forEach((node) => {
      if (!line[level]) {
        line[level] = [];
      }
      line[level].push(node.stack);
      walk(node.children, level + 1);
    });
  };
  walk(stacks, 0);
  return line;
};

// src/plugins/cron/index.ts
import { z as z7 } from "zod";

// src/plugins/cron/schema/schedule.ts
import { z } from "zod";
import { awsCronExpressionValidator } from "aws-cron-expression-validator";
var RateExpressionSchema = z.custom((value) => {
  return z.string().regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/).refine((rate) => {
    const [str] = rate.substring(5).split(" ");
    const number = parseInt(str);
    return number > 0;
  }).safeParse(value).success;
}, "Invalid rate expression");
var CronExpressionSchema = z.custom((value) => {
  return z.string().startsWith("cron(").endsWith(")").safeParse(value).success;
}, "Invalid cron expression").superRefine((value, ctx) => {
  const cron = value.substring(5, value.length - 1);
  try {
    awsCronExpressionValidator(cron);
  } catch (error) {
    if (error instanceof Error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error.message
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid cron expression"
      });
    }
  }
});
var ScheduleExpressionSchema = RateExpressionSchema.or(CronExpressionSchema);

// src/plugins/function.ts
import { z as z6 } from "zod";

// src/schema/duration.ts
import { z as z2 } from "zod";

// src/formation/property/duration.ts
var Duration = class {
  constructor(value) {
    this.value = value;
  }
  static milliseconds(value) {
    return new Duration(value);
  }
  static seconds(value) {
    return new Duration(value * 1e3 /* seconds */);
  }
  static minutes(value) {
    return new Duration(value * 6e4 /* minutes */);
  }
  static hours(value) {
    return new Duration(value * 36e5 /* hours */);
  }
  static days(value) {
    return new Duration(value * 864e5 /* days */);
  }
  toMilliseconds() {
    return this.value;
  }
  toSeconds() {
    return Math.floor(this.value / 1e3 /* seconds */);
  }
  toMinutes() {
    return Math.floor(this.value / 6e4 /* minutes */);
  }
  toHours() {
    return Math.floor(this.value / 36e5 /* hours */);
  }
  toDays() {
    return Math.floor(this.value / 864e5 /* days */);
  }
};

// src/schema/duration.ts
function toDuration(duration) {
  const [count, unit] = duration.split(" ");
  const countNum = parseInt(count);
  const unitLower = unit.toLowerCase();
  if (unitLower.startsWith("second")) {
    return Duration.seconds(countNum);
  } else if (unitLower.startsWith("minute")) {
    return Duration.minutes(countNum);
  } else if (unitLower.startsWith("hour")) {
    return Duration.hours(countNum);
  } else if (unitLower.startsWith("day")) {
    return Duration.days(countNum);
  }
  return Duration.days(0);
}
var DurationSchema = z2.custom((value) => {
  return z2.string().regex(/[0-9]+ (seconds?|minutes?|hours?|days?)/).safeParse(value).success;
}, "Invalid duration").transform(toDuration);
var durationMin = (min) => {
  return (duration) => {
    return duration.toSeconds() >= min.toSeconds();
  };
};
var durationMax = (max) => {
  return (duration) => {
    return duration.toSeconds() <= max.toSeconds();
  };
};

// src/schema/local-file.ts
import { access, constants } from "fs/promises";
import { z as z3 } from "zod";
var LocalFileSchema = z3.string().refine(async (path) => {
  try {
    await access(path, constants.R_OK);
  } catch (error) {
    return false;
  }
  return true;
}, `File doesn't exist`);

// src/schema/resource-id.ts
import { z as z4 } from "zod";
var ResourceIdSchema = z4.string().min(3).max(24).regex(/[a-z\-]+/, "Invalid resource ID");

// src/schema/size.ts
import { z as z5 } from "zod";

// src/formation/property/size.ts
var Size = class {
  constructor(bytes) {
    this.bytes = bytes;
  }
  static bytes(value) {
    return new Size(value);
  }
  static kiloBytes(value) {
    return new Size(value * 1024 /* kilo */);
  }
  static megaBytes(value) {
    return new Size(value * 1048576 /* mega */);
  }
  static gigaBytes(value) {
    return new Size(value * 1073741824 /* giga */);
  }
  toBytes() {
    return this.bytes;
  }
  toKiloBytes() {
    return Math.floor(this.bytes / 1024 /* kilo */);
  }
  toMegaBytes() {
    return Math.floor(this.bytes / 1048576 /* mega */);
  }
  toGigaBytes() {
    return Math.floor(this.bytes / 1073741824 /* giga */);
  }
};

// src/schema/size.ts
function toSize(size) {
  const [count, unit] = size.split(" ");
  const countNum = parseInt(count);
  if (unit === "KB") {
    return Size.kiloBytes(countNum);
  } else if (unit === "MB") {
    return Size.megaBytes(countNum);
  } else if (unit === "GB") {
    return Size.gigaBytes(countNum);
  }
  throw new TypeError(`Invalid size ${size}`);
}
var SizeSchema = z5.custom((value) => {
  return z5.string().regex(/[0-9]+ (KB|MB|GB)/).safeParse(value).success;
}, "Invalid size").transform(toSize);
var sizeMin = (min) => {
  return (size) => {
    return size.toBytes() >= min.toBytes();
  };
};
var sizeMax = (max) => {
  return (size) => {
    return size.toBytes() <= max.toBytes();
  };
};

// src/util/byte-size.ts
import { filesize } from "filesize";
var formatByteSize = (size) => {
  const [number, unit] = filesize(size).toString().split(" ");
  return style.attr(number) + style.attr.dim(unit);
};

// src/formation/resource/lambda/util/rollup.ts
import { rollup } from "rollup";
import { createHash } from "crypto";
import { swc } from "rollup-plugin-swc3";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
var rollupBundle = async (input) => {
  const bundle = await rollup({
    input,
    external: (importee) => {
      return importee.startsWith("@aws-sdk") || importee.startsWith("aws-sdk");
    },
    onwarn: (error) => {
      debugError(error.message);
    },
    treeshake: {
      moduleSideEffects: (id) => input === id
    },
    plugins: [
      commonjs({ sourceMap: true }),
      nodeResolve({
        preferBuiltins: true
      }),
      swc({
        minify: true,
        jsc: { minify: { sourceMap: true } },
        sourceMaps: true
      }),
      json()
    ]
  });
  const result = await bundle.generate({
    format: "esm",
    sourcemap: "hidden",
    exports: "default"
  });
  const output = result.output[0];
  const code = output.code;
  const map = output.map?.toString();
  const hash = createHash("sha1").update(code).digest("hex");
  return {
    handler: "index.default",
    hash,
    files: [{
      name: "index.mjs",
      code,
      map
    }]
  };
};

// src/formation/resource/lambda/util/zip.ts
import JSZip from "jszip";
var zipFiles = (files) => {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.code);
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9
    }
  });
};

// src/formation/resource/lambda/code.ts
var Code = class {
  static fromFile(id, file, bundler) {
    return new FileCode(id, file, bundler);
  }
  static fromInline(code, handler) {
    return new InlineCode(code, handler);
  }
};
var InlineCode = class {
  constructor(code, handler = "index.default") {
    this.code = code;
    this.handler = handler;
  }
  toCodeJson() {
    return {
      Handler: this.handler,
      Code: {
        ZipFile: this.code
      }
    };
  }
};
var FileCode = class extends Asset {
  constructor(id, file, bundler) {
    super("function", id);
    this.file = file;
    this.bundler = bundler;
  }
  handler;
  hash;
  bundle;
  s3;
  async build({ write }) {
    const bundler = this.bundler ?? rollupBundle;
    const { hash, files, handler } = await bundler(this.file);
    const bundle = await zipFiles(files);
    await Promise.all([
      write("HASH", hash),
      write("bundle.zip", bundle),
      ...files.map((file) => write(`files/${file.name}`, file.code)),
      ...files.map((file) => file.map ? write(`files/${file.name}.map`, file.map) : void 0)
    ]);
    this.handler = handler;
    this.bundle = bundle;
    this.hash = hash;
    return {
      size: formatByteSize(bundle.byteLength)
    };
  }
  async publish({ publish }) {
    this.s3 = await publish(
      `${this.id}.zip`,
      this.bundle,
      this.hash
    );
  }
  toCodeJson() {
    return {
      Handler: this.handler,
      Code: {
        S3Bucket: this.s3?.bucket ?? "",
        S3Key: this.s3?.key ?? "",
        S3ObjectVersion: this.s3?.version ?? ""
      }
    };
  }
};

// src/formation/resource/lambda/event-invoke-config.ts
var EventInvokeConfig = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::Lambda::EventInvokeConfig", logicalId);
    this.props = props;
  }
  setOnFailure(arn) {
    this.props.onFailure = arn;
    return this;
  }
  setOnSuccess(arn) {
    this.props.onSuccess = arn;
    return this;
  }
  properties() {
    return {
      FunctionName: this.props.functionName,
      Qualifier: this.props.qualifier || "$LATEST",
      ...this.attr("MaximumEventAgeInSeconds", this.props.maxEventAge?.toSeconds()),
      ...this.attr("MaximumRetryAttempts", this.props.retryAttempts),
      ...this.props.onFailure || this.props.onSuccess ? {
        DestinationConfig: {
          ...this.props.onFailure ? {
            OnFailure: {
              Destination: this.props.onFailure
            }
          } : {},
          ...this.props.onSuccess ? {
            OnSuccess: {
              Destination: this.props.onSuccess
            }
          } : {}
        }
      } : {}
    };
  }
};

// src/plugins/on-failure/util.ts
var getGlobalOnFailure = ({ config, bootstrap: bootstrap2 }) => {
  return hasOnFailure(config) ? bootstrap2.import("on-failure-queue-arn") : void 0;
};
var hasOnFailure = (config) => {
  const onFailure = config.stacks.find((stack) => {
    return typeof stack.onFailure !== "undefined";
  });
  return !!onFailure;
};

// src/plugins/function.ts
var MemorySizeSchema = SizeSchema.refine(sizeMin(Size.megaBytes(128)), "Minimum memory size is 128 MB").refine(sizeMax(Size.gigaBytes(10)), "Minimum memory size is 10 GB");
var TimeoutSchema = DurationSchema.refine(durationMin(Duration.seconds(10)), "Minimum timeout duration is 10 seconds").refine(durationMax(Duration.minutes(15)), "Maximum timeout duration is 15 minutes");
var EphemeralStorageSizeSchema = SizeSchema.refine(sizeMin(Size.megaBytes(512)), "Minimum ephemeral storage size is 512 MB").refine(sizeMax(Size.gigaBytes(10)), "Minimum ephemeral storage size is 10 GB");
var ReservedConcurrentExecutionsSchema = z6.number().int().min(0);
var EnvironmentSchema = z6.record(z6.string(), z6.string()).optional();
var ArchitectureSchema = z6.enum(["x86_64", "arm64"]);
var RetryAttemptsSchema = z6.number().int().min(0).max(2);
var RuntimeSchema = z6.enum([
  "nodejs16.x",
  "nodejs18.x"
]);
var FunctionSchema = z6.union([
  LocalFileSchema,
  z6.object({
    /** The file path ofthe function code. */
    file: LocalFileSchema,
    /** The amount of time that Lambda allows a function to run before stopping it.
     * You can specify a size value from 1 second to 15 minutes.
     * @default '10 seconds'
     */
    timeout: TimeoutSchema.optional(),
    /** The identifier of the function's runtime.
     * @default 'nodejs18.x'
     */
    runtime: RuntimeSchema.optional(),
    /** The amount of memory available to the function at runtime.
     * Increasing the function memory also increases its CPU allocation.
     * The value can be any multiple of 1 MB.
     * You can specify a size value from 128 MB to 10 GB.
     * @default '128 MB'
     */
    memorySize: MemorySizeSchema.optional(),
    /** The instruction set architecture that the function supports.
     * @default 'arm64'
     */
    architecture: ArchitectureSchema.optional(),
    /** The size of the function's /tmp directory.
     * You can specify a size value from 512 MB to 10 GB.
     * @default 512 MB
    */
    ephemeralStorageSize: EphemeralStorageSizeSchema.optional(),
    /** The maximum number of times to retry when the function returns an error.
     * You can specify a number from 0 to 2.
     * @default 2
    */
    retryAttempts: RetryAttemptsSchema.optional(),
    /** The number of simultaneous executions to reserve for the function.
     * You can specify a number from 0.
     */
    reserved: ReservedConcurrentExecutionsSchema.optional(),
    /** Environment variable key-value pairs.
     * @example
     * {
     *   environment: {
     *     name: 'value'
     *   }
     * }
     */
    environment: EnvironmentSchema.optional()
    // onFailure: ResourceIdSchema.optional(),
  })
]);
var schema = z6.object({
  defaults: z6.object({
    function: z6.object({
      /** The amount of time that Lambda allows a function to run before stopping it.
       * You can specify a size value from 1 second to 15 minutes.
       * @default '10 seconds'
       */
      timeout: TimeoutSchema.default("10 seconds"),
      /** The identifier of the function's runtime.
       * @default 'nodejs18.x'
       */
      runtime: RuntimeSchema.default("nodejs18.x"),
      /** The amount of memory available to the function at runtime.
       * Increasing the function memory also increases its CPU allocation.
       * The value can be any multiple of 1 MB.
       * You can specify a size value from 128 MB to 10 GB.
       * @default '128 MB'
       */
      memorySize: MemorySizeSchema.default("128 MB"),
      /** The instruction set architecture that the function supports.
       * @default 'arm64'
       */
      architecture: ArchitectureSchema.default("arm64"),
      /** The size of the function's /tmp directory.
       * You can specify a size value from 512 MB to 10 GB.
       * @default 512 MB
      */
      ephemeralStorageSize: EphemeralStorageSizeSchema.default("512 MB"),
      /** The maximum number of times to retry when the function returns an error.
       * You can specify a number from 0 to 2.
       * @default 2
      */
      retryAttempts: RetryAttemptsSchema.default(2),
      /** The number of simultaneous executions to reserve for the function.
       * You can specify a number from 0.
       */
      reserved: ReservedConcurrentExecutionsSchema.optional(),
      /** Environment variable key-value pairs.
       * @example
       * {
       *   environment: {
       *     name: 'value'
       *   }
       * }
       */
      environment: EnvironmentSchema.optional()
      // onFailure: ResourceIdSchema.optional(),
    }).default({})
  }).default({}),
  stacks: z6.object({
    /** Define the functions in your stack.
     * @example
     * {
     *   functions: {
     *     FUNCTION_NAME: 'function.ts'
     *   }
     * }
     */
    functions: z6.record(
      ResourceIdSchema,
      FunctionSchema
    ).optional()
  }).array()
});
var functionPlugin = definePlugin({
  name: "function",
  schema,
  onStack(ctx) {
    const { config, stack } = ctx;
    for (const [id, fileOrProps] of Object.entries(ctx.stackConfig.functions || {})) {
      const props = typeof fileOrProps === "string" ? { ...config.defaults?.function, file: fileOrProps } : { ...config.defaults?.function, ...fileOrProps };
      const lambda = toLambdaFunction(ctx, id, fileOrProps);
      const invoke = new EventInvokeConfig(id, {
        functionName: lambda.name,
        retryAttempts: props.retryAttempts,
        onFailure: getGlobalOnFailure(ctx)
      }).dependsOn(lambda);
      if (hasOnFailure(ctx.config)) {
        lambda.addPermissions({
          actions: ["sqs:SendMessage"],
          resources: [getGlobalOnFailure(ctx)]
        });
      }
      stack.add(invoke, lambda);
    }
  }
});
var toLambdaFunction = (ctx, id, fileOrProps) => {
  const config = ctx.config;
  const stack = ctx.stack;
  const props = typeof fileOrProps === "string" ? { ...config.defaults?.function, file: fileOrProps } : { ...config.defaults?.function, ...fileOrProps };
  const lambda = new Function(id, {
    name: `${config.name}-${stack.name}-${id}`,
    code: Code.fromFile(id, props.file),
    ...props
  });
  lambda.addEnvironment("APP", config.name).addEnvironment("STAGE", config.stage).addEnvironment("STACK", stack.name);
  if (props.runtime.startsWith("nodejs")) {
    lambda.addEnvironment("AWS_NODEJS_CONNECTION_REUSE_ENABLED", "1");
  }
  return lambda;
};

// src/formation/resource/events/rule.ts
var Rule = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::Events::Rule", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
  }
  name;
  get id() {
    return ref(this.logicalId);
  }
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  properties() {
    return {
      Name: this.name,
      ...this.attr("State", "ENABLED"),
      ...this.attr("Description", this.props.description),
      ...this.attr("ScheduleExpression", this.props.schedule),
      ...this.attr("RoleArn", this.props.roleArn),
      ...this.attr("EventBusName", this.props.eventBusName),
      ...this.attr("EventPattern", this.props.eventPattern),
      Targets: this.props.targets.map((target) => ({
        Arn: target.arn,
        Id: target.id,
        ...this.attr("Input", target.input && JSON.stringify(target.input))
      }))
    };
  }
};

// src/formation/resource/lambda/permission.ts
var Permission2 = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::Lambda::Permission", logicalId);
    this.props = props;
  }
  properties() {
    return {
      FunctionName: this.props.functionArn,
      Action: this.props.action || "lambda:InvokeFunction",
      Principal: this.props.principal,
      SourceArn: this.props.sourceArn
    };
  }
};

// src/formation/resource/lambda/event-source/events.ts
var EventsEventSource = class extends Group {
  constructor(id, lambda, props) {
    const rule = new Rule(id, {
      schedule: props.schedule,
      targets: [{
        id,
        arn: lambda.arn,
        input: props.payload
      }]
    });
    const permission = new Permission2(id, {
      action: "lambda:InvokeFunction",
      principal: "events.amazonaws.com",
      functionArn: lambda.arn,
      sourceArn: rule.arn
    });
    super([rule, permission]);
  }
};

// src/plugins/cron/index.ts
var cronPlugin = definePlugin({
  name: "cron",
  schema: z7.object({
    stacks: z7.object({
      /** Define the crons in your stack.
       * @example
       * {
       *   crons: {
       *     CRON_NAME: {
       *       consumer: 'function.ts',
       *       schedule: 'rate(5 minutes)',
       *     }
       *   }
       * }
       * */
      crons: z7.record(ResourceIdSchema, z7.object({
        /** The consuming lambda function properties. */
        consumer: FunctionSchema,
        /** The scheduling expression.
         * @example 'cron(0 20 * * ? *)'
         * @example 'rate(5 minutes)'
         */
        schedule: ScheduleExpressionSchema,
        // Valid JSON passed to the consumer.
        payload: z7.unknown().optional()
      })).optional()
    }).array()
  }),
  onStack(ctx) {
    const { stack, stackConfig } = ctx;
    for (const [id, props] of Object.entries(stackConfig.crons || {})) {
      const lambda = toLambdaFunction(ctx, id, props.consumer);
      const source = new EventsEventSource(id, lambda, {
        schedule: props.schedule,
        payload: props.payload
      });
      stack.add(lambda, source);
    }
  }
});

// src/plugins/queue.ts
import { z as z8 } from "zod";

// src/formation/resource/sqs/queue.ts
var Queue = class extends Resource {
  constructor(logicalId, props = {}) {
    super("AWS::SQS::Queue", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
  }
  name;
  setDeadLetter(arn) {
    this.props.deadLetterArn = arn;
    return this;
  }
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  get url() {
    return getAtt(this.logicalId, "QueueUrl");
  }
  get permissions() {
    return {
      actions: [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes"
      ],
      resources: [this.arn]
    };
  }
  properties() {
    return {
      QueueName: this.name,
      DelaySeconds: this.props.deliveryDelay?.toSeconds() ?? 0,
      MaximumMessageSize: this.props.maxMessageSize?.toBytes() ?? Size.kiloBytes(256).toBytes(),
      MessageRetentionPeriod: this.props.retentionPeriod?.toSeconds() ?? Duration.days(4).toSeconds(),
      ReceiveMessageWaitTimeSeconds: this.props.receiveMessageWaitTime?.toSeconds() ?? 0,
      VisibilityTimeout: this.props.visibilityTimeout?.toSeconds() ?? 30,
      ...this.props.deadLetterArn ? {
        RedrivePolicy: {
          deadLetterTargetArn: this.props.deadLetterArn,
          maxReceiveCount: this.props.maxReceiveCount ?? 100
        }
      } : {}
    };
  }
};

// src/formation/resource/lambda/event-source-mapping.ts
import { constantCase } from "change-case";
var EventSourceMapping = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::Lambda::EventSourceMapping", logicalId);
    this.props = props;
  }
  setOnFailure(arn) {
    this.props.onFailure = arn;
    return this;
  }
  properties() {
    return {
      Enabled: true,
      FunctionName: this.props.functionArn,
      EventSourceArn: this.props.sourceArn,
      ...this.attr("BatchSize", this.props.batchSize),
      ...this.attr("MaximumBatchingWindowInSeconds", this.props.maxBatchingWindow?.toSeconds()),
      ...this.attr("MaximumRecordAgeInSeconds", this.props.maxRecordAge?.toSeconds()),
      ...this.attr("MaximumRetryAttempts", this.props.retryAttempts),
      ...this.attr("ParallelizationFactor", this.props.parallelizationFactor),
      ...this.attr("TumblingWindowInSeconds", this.props.tumblingWindow?.toSeconds()),
      ...this.attr("BisectBatchOnFunctionError", this.props.bisectBatchOnError),
      ...this.attr("StartingPosition", this.props.startingPosition && constantCase(this.props.startingPosition)),
      ...this.attr("StartingPositionTimestamp", this.props.startingPositionTimestamp),
      ...this.props.maxConcurrency ? {
        ScalingConfig: {
          MaximumConcurrency: this.props.maxConcurrency
        }
      } : {},
      ...this.props.onFailure ? {
        DestinationConfig: {
          OnFailure: {
            Destination: this.props.onFailure
          }
        }
      } : {}
    };
  }
};

// src/formation/resource/lambda/event-source/sqs.ts
var SqsEventSource = class extends Group {
  constructor(id, lambda, props) {
    const source = new EventSourceMapping(id, {
      functionArn: lambda.arn,
      sourceArn: props.queueArn,
      batchSize: props.batchSize ?? 10,
      maxBatchingWindow: props.maxBatchingWindow,
      maxConcurrency: props.maxConcurrency
    });
    lambda.addPermissions({
      actions: [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      resources: [props.queueArn]
    });
    super([source]);
  }
};

// src/plugins/queue.ts
var RetentionPeriodSchema = DurationSchema.refine(durationMin(Duration.minutes(1)), "Minimum retention period is 1 minute").refine(durationMax(Duration.days(14)), "Maximum retention period is 14 days");
var VisibilityTimeoutSchema = DurationSchema.refine(durationMax(Duration.hours(12)), "Maximum visibility timeout is 12 hours");
var DeliveryDelaySchema = DurationSchema.refine(durationMax(Duration.minutes(15)), "Maximum delivery delay is 15 minutes");
var ReceiveMessageWaitTimeSchema = DurationSchema.refine(durationMin(Duration.seconds(1)), "Minimum receive message wait time is 1 second").refine(durationMax(Duration.seconds(20)), "Maximum receive message wait time is 20 seconds");
var MaxMessageSizeSchema = SizeSchema.refine(sizeMin(Size.kiloBytes(1)), "Minimum max message size is 1 KB").refine(sizeMax(Size.kiloBytes(256)), "Maximum max message size is 256 KB");
var BatchSizeSchema = z8.number().int().min(1, "Minimum batch size is 1").max(1e4, "Maximum batch size is 10000");
var MaxConcurrencySchema = z8.number().int().min(2, "Minimum max concurrency is 2").max(1e3, "Maximum max concurrency is 1000");
var MaxBatchingWindow = DurationSchema.refine(durationMax(Duration.minutes(5)), "Maximum max batching window is 5 minutes");
var queuePlugin = definePlugin({
  name: "queue",
  schema: z8.object({
    defaults: z8.object({
      /** Define the defaults properties for all queue's in your app. */
      queue: z8.object({
        /** The number of seconds that Amazon SQS retains a message.
         * You can specify a duration from 1 minute to 14 days.
         * @default '7 days' */
        retentionPeriod: RetentionPeriodSchema.default("7 days"),
        /** The length of time during which a message will be unavailable after a message is delivered from the queue.
         * This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue.
         * You can specify a duration from 0 to 12 hours.
         * @default '30 seconds' */
        visibilityTimeout: VisibilityTimeoutSchema.default("30 seconds"),
        /** The time in seconds for which the delivery of all messages in the queue is delayed.
         * You can specify a duration from 0 to 15 minutes.
         * @default '0 seconds' */
        deliveryDelay: DeliveryDelaySchema.default("0 seconds"),
        /** Specifies the duration, in seconds,
         * that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response,
         * rather than returning an empty response if a message isn't yet available.
         * You can specify a duration from 1 to 20 seconds.
         * Short polling is used as the default. */
        receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),
        /** The limit of how many bytes that a message can contain before Amazon SQS rejects it.
         * You can specify an size from 1 KB to 256 KB.
         * @default '256 KB' */
        maxMessageSize: MaxMessageSizeSchema.default("256 KB"),
        /** The maximum number of records in each batch that Lambda pulls from your queue and sends to your function.
         * Lambda passes all of the records in the batch to the function in a single call, up to the payload limit for synchronous invocation (6 MB).
         * You can specify an integer from 1 to 10000.
         * @default 10 */
        batchSize: BatchSizeSchema.default(10),
        /** Limits the number of concurrent instances that the queue worker can invoke.
         * You can specify an integer from 2 to 1000. */
        maxConcurrency: MaxConcurrencySchema.optional(),
        /** The maximum amount of time, that Lambda spends gathering records before invoking the function.
         * You can specify an duration from 0 seconds to 5 minutes.
         * @default '0 seconds' */
        maxBatchingWindow: MaxBatchingWindow.optional()
      }).default({})
    }).default({}),
    stacks: z8.object({
      /** Define the queues in your stack.
       * @example
       * {
       *   queues: {
       *     QUEUE_NAME: 'function.ts'
       *   }
       * }
       */
      queues: z8.record(
        ResourceIdSchema,
        z8.union([
          LocalFileSchema,
          z8.object({
            /** The consuming lambda function properties. */
            consumer: FunctionSchema,
            /** The number of seconds that Amazon SQS retains a message.
             * You can specify a duration value from 1 minute to 14 days.
             * @default '7 days' */
            retentionPeriod: RetentionPeriodSchema.optional(),
            /** The length of time during which a message will be unavailable after a message is delivered from the queue.
             * This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue.
             * You can specify a duration value from 0 to 12 hours.
             * @default '30 seconds' */
            visibilityTimeout: VisibilityTimeoutSchema.optional(),
            /** The time in seconds for which the delivery of all messages in the queue is delayed.
             * You can specify a duration value from 0 to 15 minutes.
             * @default '0 seconds' */
            deliveryDelay: DeliveryDelaySchema.optional(),
            /** Specifies the duration, in seconds,
             * that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response,
             * rather than returning an empty response if a message isn't yet available.
             * You can specify a duration value from 1 to 20 seconds.
             * Short polling is used as the default. */
            receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),
            /** The limit of how many bytes that a message can contain before Amazon SQS rejects it.
             * You can specify an size value from 1 KB to 256 KB.
             * @default '256 KB' */
            maxMessageSize: MaxMessageSizeSchema.optional(),
            /** The maximum number of records in each batch that Lambda pulls from your queue and sends to your function.
             * Lambda passes all of the records in the batch to the function in a single call, up to the payload limit for synchronous invocation (6 MB).
             * You can specify an integer from 1 to 10000.
             * @default 10 */
            batchSize: BatchSizeSchema.optional(),
            /** Limits the number of concurrent instances that the queue worker can invoke.
             * You can specify an integer from 2 to 1000. */
            maxConcurrency: MaxConcurrencySchema.optional(),
            /** The maximum amount of time, that Lambda spends gathering records before invoking the function.
             * You can specify an duration from 0 seconds to 5 minutes.
             * @default '0 seconds' */
            maxBatchingWindow: MaxBatchingWindow.optional()
          })
        ])
      ).optional()
    }).array()
  }),
  onStack(ctx) {
    const { stack, config, stackConfig, bind } = ctx;
    for (const [id, functionOrProps] of Object.entries(stackConfig.queues || {})) {
      const props = typeof functionOrProps === "string" ? { ...config.defaults.queue, consumer: functionOrProps } : { ...config.defaults.queue, ...functionOrProps };
      const queue2 = new Queue(id, {
        name: `${config.name}-${stack.name}-${id}`,
        deadLetterArn: getGlobalOnFailure(ctx),
        ...props
      });
      const lambda = toLambdaFunction(ctx, `queue-${id}`, props.consumer);
      const source = new SqsEventSource(id, lambda, {
        queueArn: queue2.arn,
        batchSize: props.batchSize,
        maxConcurrency: props.maxConcurrency,
        maxBatchingWindow: props.maxBatchingWindow
      });
      stack.add(queue2, lambda, source);
      bind((lambda2) => {
        lambda2.addPermissions(queue2.permissions);
      });
    }
  }
});

// src/plugins/table.ts
import { z as z9 } from "zod";

// src/formation/resource/dynamodb/table.ts
import { constantCase as constantCase2 } from "change-case";
var Table = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::DynamoDB::Table", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
    this.indexes = { ...this.props.indexes || {} };
  }
  name;
  indexes;
  enableStream(viewType) {
    this.props.stream = viewType;
  }
  addIndex(name, props) {
    this.indexes[name] = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  get streamArn() {
    return getAtt(this.logicalId, "StreamArn");
  }
  get permissions() {
    return {
      actions: [
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:DeleteItem",
        "dynamodb:TransactWrite",
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:ConditionCheckItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      resources: [this.arn]
    };
  }
  attributeDefinitions() {
    const fields = this.props.fields || {};
    const attributes = new Set([
      this.props.hash,
      this.props.sort,
      ...Object.values(this.props.indexes || {}).map((index) => [
        index.hash,
        index.sort
      ])
    ].flat().filter(Boolean));
    const types = {
      string: "S",
      number: "N",
      binary: "B"
    };
    return [...attributes].map((name) => ({
      AttributeName: name,
      AttributeType: types[fields[name] || "string"]
    }));
  }
  properties() {
    return {
      TableName: this.name,
      BillingMode: "PAY_PER_REQUEST",
      TableClass: constantCase2(this.props.class || "standard"),
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: this.props.pointInTimeRecovery || false
      },
      KeySchema: [
        { KeyType: "HASH", AttributeName: this.props.hash },
        ...this.props.sort ? [{ KeyType: "RANGE", AttributeName: this.props.sort }] : []
      ],
      AttributeDefinitions: this.attributeDefinitions(),
      ...this.props.stream ? {
        StreamSpecification: {
          StreamViewType: constantCase2(this.props.stream)
        }
      } : {},
      ...this.props.timeToLiveAttribute ? {
        TimeToLiveSpecification: {
          AttributeName: this.props.timeToLiveAttribute,
          Enabled: true
        }
      } : {},
      ...Object.keys(this.indexes).length ? {
        GlobalSecondaryIndexes: Object.entries(this.indexes).map(([name, props]) => ({
          IndexName: name,
          KeySchema: [
            { KeyType: "HASH", AttributeName: props.hash },
            ...props.sort ? [{ KeyType: "RANGE", AttributeName: props.sort }] : []
          ],
          Projection: {
            ProjectionType: constantCase2(props.projection || "all")
          }
        }))
      } : {}
    };
  }
};

// src/formation/resource/lambda/event-source/dynamodb.ts
var DynamoDBEventSource = class extends Group {
  constructor(id, lambda, props) {
    const source = new EventSourceMapping(id, {
      functionArn: lambda.arn,
      sourceArn: props.tableArn,
      batchSize: props.batchSize ?? 100,
      bisectBatchOnError: props.bisectBatchOnError ?? true,
      maxBatchingWindow: props.maxBatchingWindow,
      maxRecordAge: props.maxRecordAge,
      retryAttempts: props.retryAttempts ?? -1,
      parallelizationFactor: props.parallelizationFactor ?? 1,
      startingPosition: props.startingPosition,
      startingPositionTimestamp: props.startingPositionTimestamp,
      tumblingWindow: props.tumblingWindow,
      onFailure: props.onFailure
    });
    lambda.addPermissions({
      actions: [
        "dynamodb:ListStreams",
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator"
      ],
      resources: [props.tableArn]
    });
    super([source]);
  }
};

// src/plugins/table.ts
var KeySchema = z9.string().min(1).max(255);
var tablePlugin = definePlugin({
  name: "table",
  schema: z9.object({
    stacks: z9.object({
      /** Define the tables in your stack.
       * @example
       * {
       *   tables: {
       *     TABLE_NAME: {
       *       hash: 'id',
       *       fields: {
       *         id: 'number'
       *       }
       *     }
       *   }
       * }
       * */
      tables: z9.record(
        ResourceIdSchema,
        z9.object({
          /** Specifies the name of the partition / hash key that makes up the primary key for the table. */
          hash: KeySchema,
          /** Specifies the name of the range / sort key that makes up the primary key for the table. */
          sort: KeySchema.optional(),
          /** A list of attributes that describe the key schema for the table and indexes.
           * If no attribute field is defined we default to 'string'.
           * @example
           * {
           *   fields: {
           *     id: 'string'
           *   }
           * }
           */
          fields: z9.record(
            z9.string(),
            z9.enum(["string", "number", "binary"])
          ).optional(),
          /** The table class of the table.
           * @default 'standard'
           */
          class: z9.enum(["standard", "standard-infrequent-access"]).default("standard"),
          /** Indicates whether point in time recovery is enabled on the table.
           * @default false
           */
          pointInTimeRecovery: z9.boolean().default(false),
          /** The name of the TTL attribute used to store the expiration time for items in the table.
           * - To update this property, you must first disable TTL and then enable TTL with the new attribute name.
           */
          timeToLiveAttribute: KeySchema.optional(),
          /** The settings for the DynamoDB table stream, which capture changes to items stored in the table. */
          stream: z9.object({
            /** When an item in the table is modified,
             * stream.type determines what information is written to the stream for this table.
             * Valid values are:
             * - keys-only - Only the key attributes of the modified item are written to the stream.
             * - new-image - The entire item, as it appears after it was modified, is written to the stream.
             * - old-image - The entire item, as it appeared before it was modified, is written to the stream.
             * - new-and-old-images - Both the new and the old item images of the item are written to the stream.
             */
            type: z9.enum(["keys-only", "new-image", "old-image", "new-and-old-images"]),
            /** The consuming lambda function for the stream */
            consumer: FunctionSchema
          }).optional(),
          /** Specifies the global secondary indexes to be created on the table.
           * @example
           * {
           *   indexes: {
           *     INDEX_NAME: {
           *       hash: 'other'
           *     }
           *   }
           * }
           */
          indexes: z9.record(z9.string(), z9.object({
            /** Specifies the name of the partition / hash key that makes up the primary key for the global secondary index. */
            hash: KeySchema,
            /** Specifies the name of the range / sort key that makes up the primary key for the global secondary index. */
            sort: KeySchema.optional(),
            /** The set of attributes that are projected into the index:
             * - all - All of the table attributes are projected into the index.
             * - keys-only - Only the index and primary keys are projected into the index.
             * @default 'all'
             */
            projection: z9.enum(["all", "keys-only"]).default("all")
          })).optional()
        })
        // .refine(props => {
        // 	return (
        // 		// Check the hash key
        // 		props.fields.hasOwnProperty(props.hash) &&
        // 		// Check the sort key
        // 		(!props.sort || props.fields.hasOwnProperty(props.sort)) &&
        // 		// Check all indexes
        // 		!Object.values(props.indexes || {}).map(index => (
        // 			// Check the index hash key
        // 			props.fields.hasOwnProperty(index.hash) &&
        // 			// Check the index sort key
        // 			(!index.sort || props.fields.hasOwnProperty(index.sort))
        // 		)).includes(false)
        // 	)
        // }, 'Hash & Sort keys must be defined inside the table fields')
      ).optional()
    }).array()
  }),
  onStack(ctx) {
    const { config, stack, stackConfig, bind } = ctx;
    for (const [id, props] of Object.entries(stackConfig.tables || {})) {
      const table = new Table(id, {
        ...props,
        name: `${config.name}-${stack.name}-${id}`,
        stream: props.stream?.type
      });
      stack.add(table);
      if (props.stream) {
        const lambda = toLambdaFunction(ctx, `stream-${id}`, props.stream.consumer);
        const source = new DynamoDBEventSource(id, lambda, {
          tableArn: table.arn,
          onFailure: getGlobalOnFailure(ctx),
          ...props.stream
        });
        stack.add(lambda, source);
      }
      bind((lambda) => {
        lambda.addPermissions(table.permissions);
      });
    }
  }
});

// src/plugins/store.ts
import { z as z10 } from "zod";

// src/formation/resource/s3/bucket.ts
import { pascalCase as pascalCase2 } from "change-case";
var Bucket = class extends Resource {
  constructor(logicalId, props = {}) {
    super("AWS::S3::Bucket", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
  }
  name;
  get arn() {
    return ref(this.logicalId);
  }
  get domainName() {
    return getAtt(this.logicalId, "DomainName");
  }
  get permissions() {
    return {
      actions: [
        "s3:SendMessage",
        "s3:ReceiveMessage",
        "s3:GetQueueUrl",
        "s3:GetQueueAttributes"
      ],
      resources: [this.arn]
    };
  }
  properties() {
    return {
      BucketName: this.name,
      AccessControl: pascalCase2(this.props.accessControl ?? "private"),
      ...this.props.versioned ? {
        VersioningConfiguration: {
          Status: "Enabled"
        }
      } : {}
    };
  }
};

// src/plugins/store.ts
var storePlugin = definePlugin({
  name: "store",
  schema: z10.object({
    stacks: z10.object({
      /** Define the stores in your stack.
       * @example
       * {
       *   stores: [ 'STORE_NAME' ]
       * }
       */
      stores: z10.array(ResourceIdSchema).optional()
    }).array()
  }),
  onStack({ config, stack, stackConfig, bind }) {
    for (const id of stackConfig.stores || []) {
      const bucket = new Bucket(id, {
        name: `${config.name}-${stack.name}-${id}`,
        accessControl: "private"
      });
      stack.add(bucket);
      bind((lambda) => {
        lambda.addPermissions(bucket.permissions);
      });
    }
  }
});

// src/plugins/topic.ts
import { z as z11 } from "zod";

// src/formation/resource/sns/topic.ts
var Topic = class extends Resource {
  constructor(logicalId, props = {}) {
    super("AWS::SNS::Topic", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
  }
  name;
  get arn() {
    return ref(this.logicalId);
  }
  get permissions() {
    return {
      actions: ["sns:Publish"],
      resources: [this.arn]
    };
  }
  properties() {
    return {
      TopicName: this.name,
      DisplayName: this.name
    };
  }
};

// src/formation/resource/sns/subscription.ts
var Subscription = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::SNS::Subscription", logicalId);
    this.props = props;
  }
  properties() {
    return {
      TopicArn: this.props.topicArn,
      Protocol: this.props.protocol,
      Endpoint: this.props.endpoint
    };
  }
};

// src/formation/resource/lambda/event-source/sns.ts
var SnsEventSource = class extends Group {
  constructor(id, lambda, props) {
    const topic = new Subscription(id, {
      topicArn: props.topicArn,
      protocol: "lambda",
      endpoint: lambda.arn
    });
    const permission = new Permission2(id, {
      action: "lambda:InvokeFunction",
      principal: "sns.amazonaws.com",
      functionArn: lambda.arn,
      sourceArn: props.topicArn
    });
    super([topic, permission]);
  }
};

// src/plugins/topic.ts
var topicPlugin = definePlugin({
  name: "topic",
  schema: z11.object({
    stacks: z11.object({
      /** Define the topics to listen too in your stack.
       * @example
       * {
       *   topics: {
       *     TOPIC_NAME: 'function.ts'
       *   }
       * }
       */
      topics: z11.record(ResourceIdSchema, FunctionSchema).optional()
    }).array()
  }),
  onApp({ config, bootstrap: bootstrap2, bind }) {
    const allTopicNames = config.stacks.map((stack) => {
      return Object.keys(stack.topics || {});
    }).flat();
    const uniqueTopicNames = [...new Set(allTopicNames)];
    for (const id of uniqueTopicNames) {
      const topic = new Topic(id, {
        name: `${config.name}-${id}`
      });
      bootstrap2.add(topic);
      bootstrap2.export(`topic-${id}-arn`, topic.arn);
    }
    bind((lambda) => {
      lambda.addPermissions({
        actions: ["sns:Publish"],
        resources: [
          sub("arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${app}-*", {
            app: config.name
          })
        ]
      });
    });
  },
  onStack(ctx) {
    const { stack, stackConfig, bootstrap: bootstrap2 } = ctx;
    for (const [id, props] of Object.entries(stackConfig.topics || {})) {
      const lambda = toLambdaFunction(ctx, `topic-${id}`, props);
      const source = new SnsEventSource(id, lambda, {
        topicArn: bootstrap2.import(`topic-${id}-arn`)
      });
      stack.add(lambda, source);
    }
  }
});

// src/plugins/extend.ts
import { z as z12 } from "zod";
var extendPlugin = definePlugin({
  name: "extend",
  schema: z12.object({
    /** Extend your app with custom resources. */
    extend: z12.custom().optional(),
    stacks: z12.object({
      /** Extend your stack with custom resources. */
      extend: z12.custom().optional()
    }).array()
  }),
  onApp(ctx) {
    ctx.config.extend?.(ctx);
  },
  onStack(ctx) {
    ctx.stackConfig.extend?.(ctx);
  }
});

// src/plugins/pubsub.ts
import { z as z13 } from "zod";

// src/formation/resource/iot/topic-rule.ts
import { snakeCase } from "change-case";
var TopicRule = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::IoT::TopicRule", logicalId);
    this.props = props;
    this.name = snakeCase(this.props.name || logicalId);
  }
  name;
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  properties() {
    return {
      RuleName: this.name,
      TopicRulePayload: {
        Sql: this.props.sql,
        AwsIotSqlVersion: this.props.sqlVersion ?? "2016-03-23",
        RuleDisabled: false,
        Actions: this.props.actions.map((action) => ({
          Lambda: { FunctionArn: action.lambda.functionArn }
        }))
      }
    };
  }
};

// src/formation/resource/lambda/event-source/iot.ts
var IotEventSource = class extends Group {
  constructor(id, lambda, props) {
    const topic = new TopicRule(id, {
      name: props.name,
      sql: props.sql,
      sqlVersion: props.sqlVersion,
      actions: [{ lambda: { functionArn: lambda.arn } }]
    });
    const permission = new Permission2(id, {
      action: "lambda:InvokeFunction",
      principal: "iot.amazonaws.com",
      functionArn: lambda.arn,
      sourceArn: topic.arn
    });
    super([topic, permission]);
  }
};

// src/plugins/pubsub.ts
var pubsubPlugin = definePlugin({
  name: "pubsub",
  schema: z13.object({
    stacks: z13.object({
      /** Define the pubsub subscriber in your stack.
       * @example
       * {
       *   pubsub: {
       *     NAME: {
       *       sql: 'SELECT * FROM "table"',
       *       consumer: 'function.ts',
       *     }
       *   }
       * }
       */
      pubsub: z13.record(ResourceIdSchema, z13.object({
        /** The SQL statement used to query the iot topic. */
        sql: z13.string(),
        /** The version of the SQL rules engine to use when evaluating the rule. */
        sqlVersion: z13.enum(["2015-10-08", "2016-03-23", "beta"]).default("2016-03-23"),
        /** The consuming lambda function properties. */
        consumer: FunctionSchema
      })).optional()
    }).array()
  }),
  onApp({ bind }) {
    bind((lambda) => {
      lambda.addPermissions({
        actions: ["iot:publish"],
        resources: ["*"]
      });
    });
  },
  onStack(ctx) {
    const { config, stack, stackConfig } = ctx;
    for (const [id, props] of Object.entries(stackConfig.pubsub || {})) {
      const lambda = toLambdaFunction(ctx, `pubsub-${id}`, props.consumer);
      const source = new IotEventSource(id, lambda, {
        name: `${config.name}-${stack.name}-${id}`,
        sql: props.sql,
        sqlVersion: props.sqlVersion
      });
      stack.add(lambda, source);
    }
  }
});

// src/plugins/graphql.ts
import { z as z14 } from "zod";

// src/util/array.ts
var toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};

// src/plugins/graphql.ts
import { paramCase as paramCase3 } from "change-case";

// src/formation/resource/appsync/graphql-api.ts
import { constantCase as constantCase3 } from "change-case";
var GraphQLApi = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::GraphQLApi", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
  }
  name;
  lambdaAuthProviders = [];
  get arn() {
    return ref(this.logicalId);
  }
  get id() {
    return getAtt(this.logicalId, "ApiId");
  }
  get url() {
    return getAtt(this.logicalId, "GraphQLUrl");
  }
  get dns() {
    return getAtt(this.logicalId, "GraphQLDns");
  }
  addLambdaAuthProvider(lambdaAuthorizerArn, resultTTL = Duration.seconds(0)) {
    this.lambdaAuthProviders.push({
      arn: lambdaAuthorizerArn,
      ttl: resultTTL
    });
    return this;
  }
  properties() {
    return {
      Name: this.name,
      AuthenticationType: constantCase3(this.props.authenticationType || "api-key"),
      AdditionalAuthenticationProviders: this.lambdaAuthProviders.map((provider) => ({
        AuthenticationType: "AWS_LAMBDA",
        LambdaAuthorizerConfig: {
          AuthorizerUri: provider.arn,
          AuthorizerResultTtlInSeconds: provider.ttl.toSeconds()
        }
      }))
    };
  }
};

// src/formation/resource/route53/record-set.ts
var RecordSet = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::Route53::RecordSet", logicalId);
    this.props = props;
    this.name = this.props.name || this.logicalId;
  }
  name;
  properties() {
    return {
      HostedZoneId: this.props.hostedZoneId,
      Name: this.name + ".",
      Type: this.props.type,
      TTL: this.props.ttl,
      ...this.props.records ? {
        ResourceRecords: this.props.records
      } : {},
      ...this.props.alias ? {
        AliasTarget: {
          DNSName: this.props.alias.dnsName,
          HostedZoneId: this.props.alias.hostedZoneId
        }
      } : {}
    };
  }
};

// src/formation/resource/appsync/graphql-schema.ts
import { print } from "graphql";
import { readFile } from "fs/promises";
import { mergeTypeDefs } from "@graphql-tools/merge";
var GraphQLSchema = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::GraphQLSchema", logicalId, [
      props.definition
    ]);
    this.props = props;
  }
  properties() {
    return {
      ApiId: this.props.apiId,
      Definition: this.props.definition.toString()
    };
  }
};
var Definition = class extends Asset {
  constructor(id, files) {
    super("graphql", id);
    this.files = files;
  }
  schema;
  async build({ write }) {
    const files = [this.files].flat();
    const schemas = await Promise.all(files.map((file) => {
      return readFile(file, "utf8");
    }));
    const defs = mergeTypeDefs(schemas);
    const schema2 = print(defs);
    const size = Buffer.from(schema2, "utf8").byteLength;
    await write("schema.gql", schema2);
    this.schema = schema2;
    return {
      size: formatByteSize(size)
    };
  }
  toString() {
    return this.schema;
  }
};

// src/formation/resource/appsync/code.ts
import { readFile as readFile2 } from "fs/promises";
var Code2 = class {
  static fromFile(id, file) {
    return new FileCode2(id, file);
  }
  static fromInline(id, code) {
    return new InlineCode2(id, code);
  }
};
var InlineCode2 = class extends Asset {
  constructor(id, code) {
    super("resolver", id);
    this.code = code;
  }
  toCodeJson() {
    return {
      Code: this.code
    };
  }
};
var FileCode2 = class extends Asset {
  constructor(id, file) {
    super("resolver", id);
    this.file = file;
  }
  code;
  async build() {
    const code = await readFile2(this.file);
    this.code = code.toString("utf8");
    return {
      size: formatByteSize(code.byteLength)
    };
  }
  toCodeJson() {
    return {
      Code: this.code
    };
  }
};

// src/formation/resource/appsync/data-source.ts
import { snakeCase as snakeCase2 } from "change-case";
var DataSource = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::DataSource", logicalId);
    this.props = props;
    this.name = snakeCase2(this.props.name || logicalId);
  }
  static fromLambda(logicalId, apiId, props) {
    return new DataSource(logicalId, {
      apiId,
      type: "AWS_LAMBDA",
      serviceRoleArn: props.serviceRoleArn,
      config: {
        lambda: {
          functionArn: props.functionArn
        }
      }
    });
  }
  static fromNone(logicalId, apiId) {
    return new DataSource(logicalId, {
      apiId,
      type: "NONE"
    });
  }
  name;
  get arn() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      ApiId: this.props.apiId,
      Name: this.name,
      Type: this.props.type,
      ServiceRoleArn: this.props.serviceRoleArn,
      ...this.props.config?.lambda ? {
        LambdaConfig: {
          LambdaFunctionArn: this.props.config.lambda.functionArn
        }
      } : {}
    };
  }
};

// src/formation/resource/appsync/function-configuration.ts
import { snakeCase as snakeCase3 } from "change-case";
var FunctionConfiguration = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::FunctionConfiguration", logicalId, [
      props.code
    ]);
    this.props = props;
    this.name = snakeCase3(this.props.name || logicalId);
  }
  name;
  get id() {
    return getAtt(this.logicalId, "FunctionId");
  }
  get arn() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      ApiId: this.props.apiId,
      Name: this.name,
      DataSourceName: this.props.dataSourceName,
      ...this.props.code.toCodeJson(),
      FunctionVersion: "2018-05-29",
      Runtime: {
        Name: "APPSYNC_JS",
        RuntimeVersion: "1.0.0"
      }
    };
  }
};

// src/formation/resource/appsync/resolver.ts
var Resolver = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::Resolver", logicalId);
    this.props = props;
  }
  properties() {
    return {
      ApiId: this.props.apiId,
      Kind: "PIPELINE",
      TypeName: this.props.typeName,
      FieldName: this.props.fieldName,
      PipelineConfig: {
        Functions: this.props.functions
      },
      // DataSourceName: this.props.dataSourceName,
      ...this.props.code.toCodeJson(),
      Runtime: {
        Name: "APPSYNC_JS",
        RuntimeVersion: "1.0.0"
      }
    };
  }
};

// src/formation/resource/lambda/event-source/appsync.ts
var AppsyncEventSource = class extends Group {
  constructor(id, lambda, props) {
    const role = new Role(id + "AppSync", {
      assumedBy: "appsync.amazonaws.com"
    }).dependsOn(lambda);
    role.addInlinePolicy(new InlinePolicy(id, {
      statements: [{
        actions: ["lambda:InvokeFunction"],
        resources: [lambda.arn]
      }]
    }));
    const source = DataSource.fromLambda(id, props.apiId, {
      functionArn: lambda.arn,
      serviceRoleArn: role.arn
    }).dependsOn(role).dependsOn(lambda);
    const config = new FunctionConfiguration(id, {
      apiId: props.apiId,
      code: props.code,
      dataSourceName: source.name
    }).dependsOn(source);
    const resolver = new Resolver(id, {
      apiId: props.apiId,
      typeName: props.typeName,
      fieldName: props.fieldName,
      functions: [config.id],
      code: props.code
    }).dependsOn(config);
    super([role, source, config, resolver]);
  }
};

// src/formation/resource/appsync/domain-name.ts
var DomainName = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::DomainName", logicalId);
    this.props = props;
  }
  get appSyncDomainName() {
    return getAtt(this.logicalId, "AppSyncDomainName");
  }
  get domainName() {
    return getAtt(this.logicalId, "DomainName");
  }
  get hostedZoneId() {
    return getAtt(this.logicalId, "HostedZoneId");
  }
  properties() {
    return {
      DomainName: this.props.domainName,
      CertificateArn: this.props.certificateArn
    };
  }
};
var DomainNameApiAssociation = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::AppSync::DomainNameApiAssociation", logicalId);
    this.props = props;
  }
  properties() {
    return {
      ApiId: this.props.apiId,
      DomainName: this.props.domainName
    };
  }
};

// src/plugins/graphql.ts
var defaultResolver = `
export function request(ctx) {
	return {
		operation: 'Invoke',
		payload: ctx,
	};
}

export function response(ctx) {
	return ctx.result
}
`;
var ResolverFieldSchema = z14.custom((value) => {
  return z14.string().regex(/([a-z0-9\_]+)(\s){1}([a-z0-9\_]+)/gi).safeParse(value).success;
}, `Invalid resolver field. Valid example: "Query list"`);
var graphqlPlugin = definePlugin({
  name: "graphql",
  schema: z14.object({
    defaults: z14.object({
      graphql: z14.record(ResourceIdSchema, z14.object({
        domain: z14.string().optional(),
        subDomain: z14.string().optional(),
        authorization: z14.object({
          authorizer: FunctionSchema,
          ttl: DurationSchema.default("1 hour")
        }).optional(),
        resolver: LocalFileSchema.optional()
      })).optional()
    }).default({}),
    stacks: z14.object({
      graphql: z14.record(ResourceIdSchema, z14.object({
        schema: z14.union([
          LocalFileSchema,
          z14.array(LocalFileSchema).min(1)
        ]).optional(),
        resolvers: z14.record(ResolverFieldSchema, FunctionSchema).optional()
      })).optional()
    }).array()
  }),
  onApp(ctx) {
    const { config, bootstrap: bootstrap2, usEastBootstrap } = ctx;
    const apis = /* @__PURE__ */ new Set();
    for (const stackConfig of config.stacks) {
      for (const id of Object.keys(stackConfig.graphql || {})) {
        apis.add(id);
      }
    }
    for (const id of apis) {
      const schemaFiles = [];
      for (const stack of config.stacks) {
        const files = toArray(stack.graphql?.[id]?.schema || []);
        schemaFiles.push(...files);
      }
      const api = new GraphQLApi(id, {
        name: `${config.name}-${id}`,
        authenticationType: "api-key"
      });
      const schema2 = new GraphQLSchema(id, {
        apiId: api.id,
        definition: new Definition(id, schemaFiles)
      }).dependsOn(api);
      bootstrap2.add(api).add(schema2).export(`graphql-${id}`, api.id);
      const props = config.defaults.graphql?.[id];
      if (!props) {
        continue;
      }
      if (props.authorization) {
        const lambda = toLambdaFunction(ctx, `${id}-authorizer`, props.authorization.authorizer);
        api.addLambdaAuthProvider(lambda.arn, props.authorization.ttl);
        bootstrap2.add(lambda);
      }
      if (props.domain) {
        const domainName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain;
        const hostedZoneId = usEastBootstrap.import(`hosted-zone-${props.domain}-id`);
        const certificateArn = usEastBootstrap.import(`certificate-${props.domain}-arn`);
        const domain = new DomainName(id, {
          domainName,
          certificateArn
        });
        const association = new DomainNameApiAssociation(id, {
          apiId: api.id,
          domainName: domain.domainName
        }).dependsOn(api, domain);
        const record = new RecordSet(`${id}-graphql`, {
          hostedZoneId,
          type: "A",
          name: domainName,
          alias: {
            dnsName: domain.appSyncDomainName,
            hostedZoneId: domain.hostedZoneId
          }
        }).dependsOn(domain, association);
        bootstrap2.add(domain, association, record);
      }
    }
  },
  onStack(ctx) {
    const { stack, stackConfig, bootstrap: bootstrap2 } = ctx;
    for (const [id, props] of Object.entries(stackConfig.graphql || {})) {
      const apiId = bootstrap2.import(`graphql-${id}`);
      for (const [typeAndField, functionProps] of Object.entries(props.resolvers || {})) {
        const [typeName, fieldName] = typeAndField.split(/[\s]+/g);
        const entryId = paramCase3(`${id}-${typeName}-${fieldName}`);
        const lambda = toLambdaFunction(ctx, `graphql-${entryId}`, functionProps);
        const source = new AppsyncEventSource(entryId, lambda, {
          apiId,
          typeName,
          fieldName,
          code: Code2.fromInline(entryId, defaultResolver)
        });
        stack.add(lambda, source);
      }
    }
  }
});

// src/plugins/domain.ts
import { z as z15 } from "zod";

// src/formation/resource/route53/hosted-zone.ts
var HostedZone = class extends Resource {
  constructor(logicalId, props = {}) {
    super("AWS::Route53::HostedZone", logicalId);
    this.props = props;
    this.name = this.props.domainName || logicalId;
  }
  name;
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      Name: this.name + "."
    };
  }
};

// src/formation/resource/certificate-manager/certificate.ts
var Certificate = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::CertificateManager::Certificate", logicalId);
    this.props = props;
    this.name = this.props.domainName || logicalId;
  }
  name;
  get arn() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      DomainName: this.name,
      SubjectAlternativeNames: this.props.alternativeNames || [],
      ValidationMethod: "DNS",
      DomainValidationOptions: [{
        DomainName: this.name,
        HostedZoneId: this.props.hostedZoneId
      }]
    };
  }
};

// src/formation/resource/route53/record-set-group.ts
var RecordSetGroup = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::Route53::RecordSetGroup", logicalId);
    this.props = props;
  }
  properties() {
    return {
      HostedZoneId: this.props.hostedZoneId,
      RecordSets: this.props.records.map((props) => ({
        Name: props.name + ".",
        Type: props.type,
        TTL: props.ttl,
        ...props.records ? {
          ResourceRecords: props.records
        } : {},
        ...props.alias ? {
          AliasTarget: {
            DNSName: props.alias,
            HostedZoneId: this.props.hostedZoneId
          }
        } : {}
      }))
    };
  }
};

// src/custom/delete-hosted-zone/handler.ts
var deleteHostedZoneRecordsHandlerCode = (
  /* JS */
  `

const { Route53Client, ListResourceRecordSetsCommand, ChangeResourceRecordSetsCommand } = require('@aws-sdk/client-route-53')

const client = new Route53Client({})

exports.handler = async (event) => {
	const type = event.RequestType
	const hostedZoneId = event.ResourceProperties.hostedZoneId

	try {
		if(type === 'Delete') {
			const records = await listHostedZoneRecords(hostedZoneId)
			console.log(records)

			await deleteHostedZoneRecords(hostedZoneId, records)
		}

		await send(event, hostedZoneId, 'SUCCESS')
	}
	catch(error) {
		if (error instanceof Error) {
			await send(event, hostedZoneId, 'FAILED', {}, error.message)
		} else {
			await send(event, hostedZoneId, 'FAILED', {}, 'Unknown error')
		}
	}
}

const send = async (event, id, status, data = {}, reason = '') => {
	const body = JSON.stringify({
		Status: status,
		Reason: reason,
		PhysicalResourceId: id,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		NoEcho: false,
		Data: data
	})

	await fetch(event.ResponseURL, {
		method: 'PUT',
		port: 443,
		body,
		headers: {
			'content-type': '',
            'content-length': Buffer.from(body).byteLength,
		},
	})
}

const deleteHostedZoneRecords = async (hostedZoneId, records) => {
	records = records.filter(record => ![ 'SOA', 'NS' ].includes(record.Type))
	if(records.length === 0) {
		return
	}

	const chunkSize = 100;
	for (let i = 0; i < records.length; i += chunkSize) {
		const chunk = records.slice(i, i + chunkSize);

		await client.send(new ChangeResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			ChangeBatch: {
				Changes: chunk.map(record => ({
					Action: 'DELETE',
					ResourceRecordSet: record
				}))
			}
		}))
	}
}

const listHostedZoneRecords = async (hostedZoneId) => {

	const records = []
	let token

	while(true) {
		const result = await client.send(new ListResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			NextRecordName: token
		}))

		if(result.ResourceRecordSets && result.ResourceRecordSets.length) {
			records.push(...result.ResourceRecordSets)
		}

		if(result.NextRecordName) {
			token = result.NextRecordName
		} else {
			return records
		}
	}
}
`
);

// src/formation/resource/cloud-formation/custom-resource.ts
var CustomResource = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::CloudFormation::CustomResource", logicalId);
    this.props = props;
  }
  getAtt(name) {
    return getAtt(this.logicalId, name);
  }
  properties() {
    return {
      ServiceToken: this.props.serviceToken,
      ...this.props.properties
    };
  }
};

// src/plugins/domain.ts
var DomainNameSchema = z15.string().regex(/[a-z\-\_\.]/g, "Invalid domain name");
var domainPlugin = definePlugin({
  name: "domain",
  schema: z15.object({
    /** Define the domains for your application.
     * @example
     * {
     *   domains: {
     *     'example.com': [{
     *       name: 'www',
     *       type: 'TXT',
     *       ttl: '60 seconds',
     *       records: [ 'value' ]
     *     }]
     *   }
     * }
     */
    domains: z15.record(DomainNameSchema, z15.object({
      /** Enter a fully qualified domain name, for example, www.example.com.
       * You can optionally include a trailing dot.
       * If you omit the trailing dot, Amazon Route 53 assumes that the domain name that you specify is fully qualified.
       * This means that Route 53 treats www.example.com (without a trailing dot) and www.example.com. (with a trailing dot) as identical.
       */
      name: DomainNameSchema.optional(),
      /** The DNS record type. */
      type: z15.enum(["A", "AAAA", "CAA", "CNAME", "DS", "MX", "NAPTR", "NS", "PTR", "SOA", "SPF", "SRV", "TXT"]),
      /** The resource record cache time to live (TTL). */
      ttl: DurationSchema,
      /** One or more values that correspond with the value that you specified for the Type property. */
      records: z15.string().array()
    }).array()).optional()
  }),
  onApp({ config, bootstrap: bootstrap2, usEastBootstrap }) {
    const domains = Object.entries(config.domains || {});
    if (domains.length === 0) {
      return;
    }
    const lambda = new Function("delete-hosted-zone", {
      name: `${config.name}-delete-hosted-zone`,
      code: Code.fromInline(deleteHostedZoneRecordsHandlerCode, "index.handler")
    });
    lambda.addPermissions({
      actions: [
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets"
      ],
      resources: ["*"]
    });
    usEastBootstrap.add(lambda);
    for (const [domain, records] of domains) {
      const hostedZone = new HostedZone(domain);
      const usEastCertificate = new Certificate(domain, {
        hostedZoneId: hostedZone.id,
        alternativeNames: [`*.${domain}`]
      });
      const custom = new CustomResource(domain, {
        serviceToken: lambda.arn,
        properties: {
          hostedZoneId: hostedZone.id
        }
      }).dependsOn(hostedZone);
      usEastBootstrap.add(custom).add(hostedZone).add(usEastCertificate).export(`certificate-${domain}-arn`, usEastCertificate.arn).export(`hosted-zone-${domain}-id`, hostedZone.id);
      const certificate = new Certificate(domain, {
        hostedZoneId: usEastBootstrap.import(`hosted-zone-${domain}-id`),
        alternativeNames: [`*.${domain}`]
      });
      bootstrap2.add(certificate).export(`certificate-${domain}-arn`, certificate.arn);
      if (records.length > 0) {
        const group = new RecordSetGroup(domain, {
          hostedZoneId: hostedZone.id,
          records
        }).dependsOn(hostedZone);
        usEastBootstrap.add(group);
      }
    }
  }
});

// src/plugins/on-failure/index.ts
import { z as z16 } from "zod";
var onFailurePlugin = definePlugin({
  name: "on-failure",
  schema: z16.object({
    stacks: z16.object({
      /** Defining a onFailure handler will add a global onFailure handler for the following resources:
       * - Async lambda functions
       * - SQS queues
       * - DynamoDB streams
       * @example
       * {
       *   onFailure: 'on-failure.ts'
       * }
       */
      onFailure: FunctionSchema.optional()
    }).array()
  }),
  onApp({ config, bootstrap: bootstrap2 }) {
    if (!hasOnFailure(config)) {
      return;
    }
    const queue2 = new Queue("on-failure", {
      name: `${config.name}-failure`
    });
    bootstrap2.add(queue2).export("on-failure-queue-arn", queue2.arn);
  },
  onStack(ctx) {
    const { stack, stackConfig, bootstrap: bootstrap2 } = ctx;
    const onFailure = stackConfig.onFailure;
    if (!onFailure) {
      return;
    }
    const queueArn = bootstrap2.import("on-failure-queue-arn");
    const lambda = toLambdaFunction(ctx, "on-failure", onFailure);
    const source = new SqsEventSource("on-failure", lambda, {
      queueArn
    });
    lambda.addPermissions({
      actions: [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes"
      ],
      resources: [queueArn]
    });
    stack.add(lambda, source);
  }
});

// src/formation/resource/ec2/vpc.ts
var Vpc = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::VPC", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      CidrBlock: this.props.cidrBlock.ip
    };
  }
};
var RouteTable = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::RouteTable", logicalId);
    this.props = props;
    this.name = formatName(props.name || logicalId);
  }
  name;
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      VpcId: this.props.vpcId,
      Tags: [{
        Key: "name",
        Value: this.name
      }]
    };
  }
};
var InternetGateway = class extends Resource {
  constructor(logicalId) {
    super("AWS::EC2::InternetGateway", logicalId);
  }
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {};
  }
};
var VPCGatewayAttachment = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::VPCGatewayAttachment", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      VpcId: this.props.vpcId,
      InternetGatewayId: this.props.internetGatewayId
    };
  }
};
var Route = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::Route", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      GatewayId: this.props.gatewayId,
      RouteTableId: this.props.routeTableId,
      DestinationCidrBlock: this.props.destination.ip
    };
  }
};
var Subnet = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::Subnet", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      VpcId: this.props.vpcId,
      CidrBlock: this.props.cidrBlock.ip,
      AvailabilityZone: this.props.availabilityZone
    };
  }
};
var SubnetRouteTableAssociation = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::SubnetRouteTableAssociation", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  properties() {
    return {
      SubnetId: this.props.subnetId,
      RouteTableId: this.props.routeTableId
    };
  }
};

// src/formation/resource/ec2/peer.ts
var Peer = class {
  constructor(ip, type) {
    this.ip = ip;
    this.type = type;
  }
  static ipv4(cidrIp) {
    const cidrMatch = cidrIp.match(/^(\d{1,3}\.){3}\d{1,3}(\/\d+)?$/);
    if (!cidrMatch) {
      throw new Error(`Invalid IPv4 CIDR: "${cidrIp}"`);
    }
    if (!cidrMatch[2]) {
      throw new Error(`CIDR mask is missing in IPv4: "${cidrIp}". Did you mean "${cidrIp}/32"?`);
    }
    return new Peer(cidrIp, "v4");
  }
  static anyIpv4() {
    return new Peer("0.0.0.0/0", "v4");
  }
  static ipv6(cidrIpv6) {
    const cidrMatch = cidrIpv6.match(/^([\da-f]{0,4}:){2,7}([\da-f]{0,4})?(\/\d+)?$/);
    if (!cidrMatch) {
      throw new Error(`Invalid IPv6 CIDR: "${cidrIpv6}"`);
    }
    if (!cidrMatch[3]) {
      throw new Error(`CIDR mask is missing in IPv6: "${cidrIpv6}". Did you mean "${cidrIpv6}/128"?`);
    }
    return new Peer(cidrIpv6, "v6");
  }
  static anyIpv6() {
    return new Peer("::/0", "v6");
  }
  toRuleJson() {
    switch (this.type) {
      case "v4":
        return { CidrIp: this.ip };
      case "v6":
        return { CidrIpv6: this.ip };
    }
  }
  toString() {
    return this.ip;
  }
};

// src/plugins/vpc.ts
var vpcPlugin = definePlugin({
  name: "vpc",
  // schema: z.object({
  // 	defaults: z.object({
  // 		vpc: z.boolean().default(false),
  // 	}).default({}),
  // }),
  onApp({ config, bootstrap: bootstrap2 }) {
    const vpc = new Vpc("main", {
      cidrBlock: Peer.ipv4("10.0.0.0/16")
    });
    const privateRouteTable = new RouteTable("private", {
      vpcId: vpc.id,
      name: "private"
    }).dependsOn(vpc);
    const publicRouteTable = new RouteTable("public", {
      vpcId: vpc.id,
      name: "public"
    }).dependsOn(vpc);
    const gateway = new InternetGateway("");
    const attachment = new VPCGatewayAttachment("", {
      vpcId: vpc.id,
      internetGatewayId: gateway.id
    }).dependsOn(vpc, gateway);
    const route = new Route("", {
      gatewayId: gateway.id,
      routeTableId: publicRouteTable.id,
      destination: Peer.anyIpv4()
    }).dependsOn(gateway, publicRouteTable);
    bootstrap2.export(`vpc-id`, vpc.id);
    bootstrap2.add(
      vpc,
      privateRouteTable,
      publicRouteTable,
      gateway,
      attachment,
      route
    );
    const zones = ["a", "b"];
    const tables = [privateRouteTable, publicRouteTable];
    let block = 0;
    for (const table of tables) {
      for (const i in zones) {
        const id = `${table.name}-${i}`;
        const subnet = new Subnet(id, {
          vpcId: vpc.id,
          cidrBlock: Peer.ipv4(`10.0.${block++}.0/24`),
          availabilityZone: config.region + zones[i]
        }).dependsOn(vpc);
        const association = new SubnetRouteTableAssociation(id, {
          routeTableId: table.id,
          subnetId: subnet.id
        }).dependsOn(subnet, table);
        bootstrap2.export(`${table.name}-subnet-${Number(i) + 1}`, subnet.id);
        bootstrap2.add(
          subnet,
          association
        );
      }
    }
  }
});

// src/plugins/http.ts
import { z as z17 } from "zod";

// src/formation/resource/ec2/security-group.ts
var SecurityGroup = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::EC2::SecurityGroup", logicalId);
    this.props = props;
  }
  ingress = [];
  egress = [];
  get id() {
    return ref(this.logicalId);
  }
  addIngressRule(peer, port, description) {
    this.ingress.push({
      peer,
      port,
      description
    });
    return this;
  }
  addEgressRule(peer, port, description) {
    this.egress.push({
      peer,
      port,
      description
    });
    return this;
  }
  properties() {
    return {
      VpcId: this.props.vpcId,
      GroupName: this.logicalId,
      GroupDescription: this.props.description,
      SecurityGroupIngress: this.ingress.map((rule) => ({
        Description: rule.description || "",
        ...rule.port.toRuleJson(),
        ...rule.peer.toRuleJson()
      })),
      SecurityGroupEgress: this.egress.map((rule) => ({
        Description: rule.description || "",
        ...rule.port.toRuleJson(),
        ...rule.peer.toRuleJson()
      }))
    };
  }
};

// src/formation/resource/ec2/port.ts
var Port = class {
  static tcp(port) {
    return new Port({
      protocol: "tcp" /* TCP */,
      from: port,
      to: port
    });
  }
  static tcpRange(startPort, endPort) {
    return new Port({
      protocol: "tcp" /* TCP */,
      from: startPort,
      to: endPort
    });
  }
  static allTcp() {
    return new Port({
      protocol: "tcp" /* TCP */,
      from: 0,
      to: 65535
    });
  }
  static allTraffic() {
    return new Port({
      protocol: "-1" /* ALL */
    });
  }
  protocol;
  from;
  to;
  constructor(props) {
    this.protocol = props.protocol;
    this.from = props.from;
    this.to = props.to;
  }
  toRuleJson() {
    return {
      IpProtocol: this.protocol,
      FromPort: this.from,
      ToPort: this.to
    };
  }
};

// src/formation/resource/elb/load-balancer.ts
var LoadBalancer = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::ElasticLoadBalancingV2::LoadBalancer", logicalId);
    this.props = props;
    this.name = this.props.name || logicalId;
  }
  name;
  get arn() {
    return ref(this.logicalId);
  }
  get dnsName() {
    return getAtt(this.logicalId, "DNSName");
  }
  get hostedZoneId() {
    return getAtt(this.logicalId, "CanonicalHostedZoneID");
  }
  properties() {
    return {
      Name: this.name,
      Type: this.props.type,
      Scheme: this.props.schema || "internet-facing",
      SecurityGroups: this.props.securityGroups,
      Subnets: this.props.subnets
    };
  }
};

// src/formation/resource/elb/listener.ts
import { constantCase as constantCase4 } from "change-case";
var Listener = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::ElasticLoadBalancingV2::Listener", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  get arn() {
    return getAtt(this.logicalId, "ListenerArn");
  }
  properties() {
    return {
      LoadBalancerArn: this.props.loadBalancerArn,
      Port: this.props.port,
      Protocol: constantCase4(this.props.protocol),
      Certificates: this.props.certificates.map((arn) => ({
        CertificateArn: arn
      })),
      ...this.attr("DefaultActions", this.props.defaultActions?.map((action) => action.toJSON()))
    };
  }
};
var ListenerAction = class {
  constructor(props) {
    this.props = props;
  }
  static fixedResponse(statusCode, props = {}) {
    return new ListenerAction({
      type: "fixed-response",
      fixedResponse: {
        statusCode,
        ...props
      }
    });
  }
  static forward(targets) {
    return new ListenerAction({
      type: "forward",
      forward: {
        targetGroups: targets
      }
    });
  }
  toJSON() {
    return {
      // AuthenticateCognitoConfig: AuthenticateCognitoConfig,
      // AuthenticateOidcConfig: AuthenticateOidcConfig,
      // RedirectConfig: RedirectConfig,
      Type: this.props.type,
      // Order: Integer,
      ...this.props.type === "fixed-response" ? {
        FixedResponseConfig: {
          StatusCode: this.props.fixedResponse.statusCode,
          ...this.props.fixedResponse.contentType ? {
            ContentType: this.props.fixedResponse.contentType
          } : {},
          ...this.props.fixedResponse.messageBody ? {
            MessageBody: this.props.fixedResponse.messageBody
          } : {}
        }
      } : {},
      ...this.props.type === "forward" ? {
        ForwardConfig: {
          TargetGroups: this.props.forward.targetGroups.map((target) => ({
            TargetGroupArn: target
          }))
        }
      } : {}
    };
  }
};

// src/formation/resource/elb/listener-rule.ts
var ListenerRule = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::ElasticLoadBalancingV2::ListenerRule", logicalId);
    this.props = props;
  }
  get id() {
    return ref(this.logicalId);
  }
  get arn() {
    return getAtt(this.logicalId, "ListenerArn");
  }
  properties() {
    return {
      ListenerArn: this.props.listenerArn,
      Priority: this.props.priority,
      Conditions: this.props.conditions.map((condition) => condition.toJSON()),
      Actions: this.props.actions.map((action) => action.toJSON())
    };
  }
};
var ListenerCondition = class {
  constructor(props) {
    this.props = props;
  }
  static httpRequestMethods(methods) {
    return new ListenerCondition({
      field: "http-request-method",
      methods
    });
  }
  static pathPatterns(paths) {
    return new ListenerCondition({
      field: "path-pattern",
      paths
    });
  }
  toJSON() {
    return {
      Field: this.props.field,
      ...this.props.field === "http-request-method" ? {
        HttpRequestMethodConfig: {
          Values: this.props.methods
        }
      } : {},
      ...this.props.field === "path-pattern" ? {
        PathPatternConfig: {
          Values: this.props.paths
        }
      } : {}
    };
  }
};

// src/formation/resource/elb/target-group.ts
var TargetGroup = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::ElasticLoadBalancingV2::TargetGroup", logicalId);
    this.props = props;
    this.name = formatName(this.props.name || logicalId);
  }
  name;
  get arn() {
    return ref(this.logicalId);
  }
  get fullName() {
    return getAtt(this.logicalId, "TargetGroupFullName");
  }
  properties() {
    return {
      Name: this.name,
      TargetType: this.props.type,
      Targets: this.props.targets.map((target) => ({
        Id: target
      }))
    };
  }
};

// src/formation/resource/lambda/event-source/elb.ts
var ElbEventSource = class extends Group {
  constructor(id, lambda, props) {
    const name = formatName(id);
    const permission = new Permission2(id, {
      action: "lambda:InvokeFunction",
      principal: "elasticloadbalancing.amazonaws.com",
      functionArn: lambda.arn,
      sourceArn: sub("arn:${AWS::Partition}:elasticloadbalancing:${AWS::Region}:${AWS::AccountId}:targetgroup/${name}/*", {
        name
      })
    }).dependsOn(lambda);
    const target = new TargetGroup(id, {
      name,
      type: "lambda",
      targets: [lambda.arn]
    }).dependsOn(lambda, permission);
    const rule = new ListenerRule(id, {
      listenerArn: props.listenerArn,
      priority: props.priority,
      conditions: props.conditions,
      actions: [
        ListenerAction.forward([target.arn])
      ]
    }).dependsOn(target);
    super([target, rule, permission]);
  }
};

// src/plugins/http.ts
var RouteSchema = z17.custom((route) => {
  return z17.string().regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/]*)$/ig).safeParse(route).success;
}, "Invalid route");
var parseRoute = (route) => {
  const [method, ...paths] = route.split(" ");
  const path = paths.join(" ");
  return { method, path };
};
var strToInt = (str) => {
  return parseInt(Buffer.from(str, "utf8").toString("hex"), 16);
};
var generatePriority = (stackName, route) => {
  const start = strToInt(stackName) % 500 + 1;
  const end = strToInt(route) % 100;
  const priority = start + "" + end;
  return parseInt(priority, 10);
};
var httpPlugin = definePlugin({
  name: "http",
  schema: z17.object({
    defaults: z17.object({
      /** Define your global http api's.
       * @example
       * {
       *   http: {
       *     HTTP_API_NAME: {
       *       domain: 'example.com',
       *       subDomain: 'api',
       *     }
       *   }
       * }
       */
      http: z17.record(
        ResourceIdSchema,
        z17.object({
          /** The domain to link your api with. */
          domain: z17.string(),
          subDomain: z17.string().optional()
        })
      ).optional()
    }).default({}),
    stacks: z17.object({
      /** Define routes in your stack for your global http api.
       * @example
       * {
       *   http: {
       *     HTTP_API_NAME: {
       *       'GET /': 'index.ts',
       *       'POST /posts': 'create-post.ts',
       *     }
       *   }
       * }
       */
      http: z17.record(
        ResourceIdSchema,
        z17.record(RouteSchema, FunctionSchema)
      ).optional()
    }).array()
  }),
  onApp({ config, bootstrap: bootstrap2, usEastBootstrap }) {
    if (Object.keys(config.defaults?.http || {}).length === 0) {
      return;
    }
    const vpcId = bootstrap2.get("vpc-id");
    const securityGroup = new SecurityGroup("http", {
      description: "http security group",
      vpcId
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443));
    bootstrap2.add(securityGroup);
    for (const [id, props] of Object.entries(config.defaults?.http || {})) {
      const loadBalancer = new LoadBalancer(id, {
        name: `${config.name}-${id}`,
        type: "application",
        securityGroups: [securityGroup.id],
        subnets: [
          bootstrap2.get("public-subnet-1"),
          bootstrap2.get("public-subnet-2")
        ]
      }).dependsOn(securityGroup);
      const listener = new Listener(id, {
        loadBalancerArn: loadBalancer.arn,
        port: 443,
        protocol: "https",
        certificates: [
          bootstrap2.get(`certificate-${props.domain}-arn`)
        ],
        defaultActions: [
          ListenerAction.fixedResponse(404, {
            contentType: "application/json",
            messageBody: JSON.stringify({
              message: "Route not found"
            })
          })
        ]
      }).dependsOn(loadBalancer);
      const record = new RecordSet(`${id}-http`, {
        hostedZoneId: usEastBootstrap.import(`hosted-zone-${props.domain}-id`),
        name: props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain,
        type: "A",
        alias: {
          hostedZoneId: loadBalancer.hostedZoneId,
          dnsName: loadBalancer.dnsName
        }
      }).dependsOn(loadBalancer);
      bootstrap2.add(loadBalancer, listener, record).export(`http-${id}-listener-arn`, listener.arn);
    }
  },
  onStack(ctx) {
    const { stack, stackConfig, bootstrap: bootstrap2 } = ctx;
    for (const [id, routes] of Object.entries(stackConfig.http || {})) {
      for (const [route, props] of Object.entries(routes)) {
        const { method, path } = parseRoute(route);
        const lambda = toLambdaFunction(ctx, `http-${id}`, props);
        const source = new ElbEventSource(`http-${id}-${route}`, lambda, {
          listenerArn: bootstrap2.import(`http-${id}-listener-arn`),
          priority: generatePriority(stackConfig.name, route),
          conditions: [
            ListenerCondition.httpRequestMethods([method]),
            ListenerCondition.pathPatterns([path])
          ]
        });
        stack.add(lambda, source);
      }
    }
  }
});

// src/plugins/search.ts
import { z as z18 } from "zod";

// src/formation/resource/open-search-serverless/collection.ts
var Collection = class extends Resource {
  constructor(logicalId, props) {
    super("AWS::OpenSearchServerless::Collection", logicalId);
    this.props = props;
    this.name = this.props.name || logicalId;
  }
  name;
  get id() {
    return ref(this.logicalId);
  }
  get arn() {
    return getAtt(this.logicalId, "Arn");
  }
  get endpoint() {
    return getAtt(this.logicalId, "CollectionEndpoint");
  }
  properties() {
    return {
      Name: this.name,
      Type: this.props.type.toUpperCase(),
      ...this.attr("Description", this.props.description)
    };
  }
};

// src/plugins/search.ts
var searchPlugin = definePlugin({
  name: "search",
  schema: z18.object({
    stacks: z18.object({
      searchs: z18.array(ResourceIdSchema).optional()
    }).array()
  }),
  onStack({ config, stack, stackConfig, bind }) {
    for (const id of stackConfig.searchs || []) {
      const collection = new Collection(id, {
        name: `${config.name}-${stack.name}-${id}`,
        type: "search"
      });
      bind((lambda) => {
        lambda.addPermissions({
          actions: ["aoss:APIAccessAll"],
          resources: [collection.arn]
        });
      });
    }
  }
});

// src/plugins/index.ts
var defaultPlugins = [
  extendPlugin,
  vpcPlugin,
  functionPlugin,
  cronPlugin,
  queuePlugin,
  tablePlugin,
  storePlugin,
  topicPlugin,
  pubsubPlugin,
  searchPlugin,
  domainPlugin,
  graphqlPlugin,
  httpPlugin,
  onFailurePlugin
];

// src/formation/app.ts
var App = class {
  constructor(name) {
    this.name = name;
  }
  list = /* @__PURE__ */ new Map();
  add(...stacks) {
    stacks.forEach((stack) => this.list.set(stack.name, stack));
    return this;
  }
  find(resourceType) {
    return this.stacks.map((stack) => stack.find(resourceType)).flat();
  }
  [Symbol.iterator]() {
    return this.list.values();
  }
  get stacks() {
    return [...this.list.values()];
  }
  // get resources() {
  // 	return this.stacks.map(stack => stack.resources).flat()
  // }
};

// src/custom/global-export/handler.ts
var globalExportsHandlerCode = (
  /* JS */
  `

const { CloudFormationClient, ListExportsCommand } = require('@aws-sdk/client-cloudformation')

exports.handler = async (event) => {
	const region = event.ResourceProperties.region

	try {
		const data = await listExports(region)

		await send(event, region, 'SUCCESS', data)
	} catch(error) {
		if (error instanceof Error) {
			await send(event, region, 'FAILED', {}, error.message)
		} else {
			await send(event, region, 'FAILED', {}, 'Unknown error')
		}
	}
}

const send = async (event, id, status, data, reason = '') => {
	const body = JSON.stringify({
		Status: status,
		Reason: reason,
		PhysicalResourceId: id,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		NoEcho: false,
		Data: data
	})

	await fetch(event.ResponseURL, {
		method: 'PUT',
		port: 443,
		body,
		headers: {
			'content-type': '',
            'content-length': Buffer.from(body).byteLength,
		},
	})
}

const listExports = async (region) => {
	const client = new CloudFormationClient({ region })
	const data = {}

	let token

	while(true) {
		const result = await client.send(new ListExportsCommand({
			NextToken: token
		}))

		result.Exports?.forEach(item => {
			data[item.Name] = item.Value
		})

		if(result.NextToken) {
			token = result.NextToken
		} else {
			return data
		}
	}
}
`
);

// src/custom/global-export/extend.ts
var extendWithGlobalExports = (appName, importable, exportable) => {
  let crossRegionExports;
  importable.import = (name) => {
    name = formatName(name);
    if (!importable.exports.has(name)) {
      throw new TypeError(`Undefined global export value: ${name}`);
    }
    if (!crossRegionExports) {
      const lambda = new Function("global-exports", {
        name: `${appName}-global-exports`,
        code: Code.fromInline(globalExportsHandlerCode, "index.handler")
      });
      lambda.addPermissions({
        actions: ["cloudformation:ListExports"],
        resources: ["*"]
      });
      crossRegionExports = new CustomResource("global-exports", {
        serviceToken: lambda.arn,
        properties: {
          region: importable.region
        }
      });
      exportable.add(lambda, crossRegionExports);
    }
    return crossRegionExports.getAtt(name);
  };
};

// src/app.ts
var getAllDepends = (filters) => {
  const list3 = [];
  const walk = (deps) => {
    deps.forEach((dep) => {
      !list3.includes(dep) && list3.push(dep);
      dep.depends && walk(dep.depends);
    });
  };
  walk(filters);
  return list3;
};
var toApp = async (config, filters) => {
  const app = new App(config.name);
  const stacks = [];
  const plugins = [
    ...defaultPlugins,
    ...config.plugins || []
  ];
  debug("Plugins detected:", plugins.map((plugin) => style.info(plugin.name)).join(", "));
  const bootstrap2 = new Stack("bootstrap", config.region);
  const usEastBootstrap = new Stack("us-east-bootstrap", "us-east-1");
  extendWithGlobalExports(config.name, usEastBootstrap, bootstrap2);
  app.add(bootstrap2, usEastBootstrap);
  debug("Run plugin onApp listeners");
  const bindings = [];
  const bind = (cb) => {
    bindings.push(cb);
  };
  for (const plugin of plugins) {
    plugin.onApp?.({
      config,
      app,
      bootstrap: bootstrap2,
      usEastBootstrap,
      bind
    });
  }
  debug("Stack filters:", filters.map((filter) => style.info(filter)).join(", "));
  const filterdStacks = filters.length === 0 ? config.stacks : getAllDepends(
    // config.stacks,
    config.stacks.filter((stack) => filters.includes(stack.name))
  );
  for (const stackConfig of filterdStacks) {
    const { stack } = toStack({
      config,
      stackConfig,
      bootstrap: bootstrap2,
      usEastBootstrap,
      plugins,
      app
    });
    app.add(stack);
    stacks.push({ stack, config: stackConfig });
  }
  for (const plugin of plugins) {
    for (const stack of app.stacks) {
      for (const resource of stack) {
        plugin.onResource?.({
          config,
          app,
          stack,
          bootstrap: bootstrap2,
          usEastBootstrap,
          resource
        });
      }
    }
  }
  const functions = app.find(Function);
  for (const bind2 of bindings) {
    for (const fn of functions) {
      bind2(fn);
    }
  }
  let dependencyTree = createDependencyTree(stacks);
  if (bootstrap2.size > 0) {
    dependencyTree = [{
      stack: bootstrap2,
      children: dependencyTree
    }];
  }
  if (usEastBootstrap.size > 0) {
    dependencyTree = [{
      stack: usEastBootstrap,
      children: dependencyTree
    }];
  }
  return {
    app,
    plugins,
    dependencyTree
  };
};

// src/config.ts
import { join as join3 } from "path";

// src/util/account.ts
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
var getAccountId = async (credentials, region) => {
  const client = new STSClient({ credentials, region });
  const result = await client.send(new GetCallerIdentityCommand({}));
  return result.Account;
};

// src/util/credentials.ts
import { fromIni } from "@aws-sdk/credential-providers";
var getCredentials = (profile) => {
  return fromIni({
    profile
  });
};

// src/schema/app.ts
import { z as z22 } from "zod";

// src/schema/stack.ts
import { z as z19 } from "zod";
var StackSchema = z19.object({
  name: ResourceIdSchema,
  depends: z19.array(z19.lazy(() => StackSchema)).optional()
});

// src/schema/region.ts
import { z as z20 } from "zod";
var US = ["us-east-2", "us-east-1", "us-west-1", "us-west-2"];
var AF = ["af-south-1"];
var AP = ["ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1"];
var CA = ["ca-central-1"];
var EU = ["eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2"];
var ME = ["me-south-1", "me-central-1"];
var SA = ["sa-east-1"];
var regions = [
  ...US,
  ...AF,
  ...AP,
  ...CA,
  ...EU,
  ...ME,
  ...SA
];
var RegionSchema = z20.enum(regions);

// src/schema/plugin.ts
import { z as z21 } from "zod";
var PluginSchema = z21.object({
  name: z21.string(),
  schema: z21.custom().optional(),
  // depends: z.array(z.lazy(() => PluginSchema)).optional(),
  onApp: z21.function().returns(z21.void()).optional(),
  onStack: z21.function().returns(z21.any()).optional(),
  onResource: z21.function().returns(z21.any()).optional()
  // bind: z.function().optional(),
});

// src/schema/app.ts
var AppSchema = z22.object({
  /** App name */
  name: ResourceIdSchema,
  /** The AWS region to deploy to. */
  region: RegionSchema,
  /** The AWS profile to deploy to. */
  profile: z22.string(),
  /** The deployment stage.
   * @default 'prod'
   */
  stage: z22.string().regex(/[a-z]+/).default("prod"),
  /** Default properties. */
  defaults: z22.object({}).default({}),
  /** The application stacks. */
  stacks: z22.array(StackSchema).min(1).refine((stacks) => {
    const unique = new Set(stacks.map((stack) => stack.name));
    return unique.size === stacks.length;
  }, "Must be an array of unique stacks"),
  /** Custom plugins. */
  plugins: z22.array(PluginSchema).optional()
});

// src/util/import.ts
import { transformFile } from "@swc/core";
import { dirname, join as join2 } from "path";
import { lstat as lstat2, mkdir, writeFile } from "fs/promises";

// src/util/path.ts
import { lstat } from "fs/promises";
import { join, normalize } from "path";
var root = process.cwd();
var directories = {
  root,
  get output() {
    return join(this.root, ".awsless");
  },
  get cache() {
    return join(this.output, "cache");
  },
  get asset() {
    return join(this.output, "asset");
  },
  get template() {
    return join(this.output, "template");
  }
};
var setRoot = (path = root) => {
  directories.root = path;
};
var findRootDir = async (path, configFile, level = 5) => {
  if (!level) {
    throw new TypeError("No awsless project found");
  }
  const file = join(path, configFile);
  const exists = await fileExist(file);
  if (exists) {
    return path;
  }
  return findRootDir(normalize(join(path, "..")), configFile, level - 1);
};
var fileExist = async (file) => {
  try {
    const stat = await lstat(file);
    if (stat.isFile()) {
      return true;
    }
  } catch (error) {
  }
  return false;
};

// src/util/import.ts
var resolveFileNameExtension = async (path) => {
  const options = [
    "",
    ".ts",
    ".js",
    "/index.ts",
    "/index.js"
  ];
  for (const option of options) {
    const file = path.replace(/\.js$/, "") + option;
    let stat;
    try {
      stat = await lstat2(file);
    } catch (error) {
      continue;
    }
    if (stat.isFile()) {
      return file;
    }
  }
  throw new Error(`Failed to load file: ${path}`);
};
var resolveDir = (path) => {
  return dirname(path).replace(directories.root + "/", "");
};
var importFile = async (path) => {
  const load = async (file) => {
    debug("Load file:", style.info(file));
    let { code: code2 } = await transformFile(file, {
      isModule: true
    });
    const path2 = dirname(file);
    const dir = resolveDir(file);
    code2 = code2.replaceAll("__dirname", `"${dir}"`);
    const matches = code2.match(/(import|export)\s*{\s*[a-z0-9\_\,\s\*]+\s*}\s*from\s*('|")(\.\.?[\/a-z0-9\_\-\.]+)('|");?/ig);
    if (!matches)
      return code2;
    await Promise.all(matches?.map(async (match) => {
      const parts = /('|")(\.\.?[\/a-z0-9\_\-\.]+)('|")/ig.exec(match);
      const from = parts[2];
      const file2 = await resolveFileNameExtension(join2(path2, from));
      const result = await load(file2);
      code2 = code2.replace(match, result);
    }));
    return code2;
  };
  const code = await load(path);
  const outputFile = join2(directories.cache, "config.js");
  await mkdir(directories.cache, { recursive: true });
  await writeFile(outputFile, code);
  debug("Save config file:", style.info(outputFile));
  return import(outputFile);
};

// src/config.ts
var importConfig = async (options) => {
  debug("Find the root directory");
  const configFile = options.configFile || "awsless.config.ts";
  const root2 = await findRootDir(process.cwd(), configFile);
  setRoot(root2);
  debug("CWD:", style.info(root2));
  debug("Import config file");
  const fileName = join3(root2, configFile);
  const module = await importFile(fileName);
  const appConfig = typeof module.default === "function" ? await module.default(options) : module.default;
  debug("Validate config file");
  const plugins = [
    ...defaultPlugins,
    ...appConfig.plugins || []
  ];
  let schema2 = AppSchema;
  for (const plugin of plugins) {
    if (plugin.schema) {
      schema2 = schema2.and(plugin.schema);
    }
  }
  const config = await schema2.parseAsync(appConfig);
  debug("Load credentials", style.info(config.profile));
  const credentials = getCredentials(config.profile);
  debug("Load AWS account ID");
  const account = await getAccountId(credentials, config.region);
  debug("Account ID:", style.info(account));
  return {
    ...config,
    account,
    credentials
  };
};

// src/cli/ui/layout/basic.ts
var br = () => {
  return "\n";
};
var hr = () => {
  return (term) => {
    term.out.write([
      style.placeholder("\u2500".repeat(term.out.width())),
      br()
    ]);
  };
};

// src/cli/ui/layout/list.ts
var list = (data) => {
  const padding = 3;
  const gap = 1;
  const size = Object.keys(data).reduce((total, name) => {
    return name.length > total ? name.length : total;
  }, 0);
  return (term) => {
    term.out.gap();
    term.out.write(Object.entries(data).map(([name, value]) => [
      " ".repeat(padding),
      style.label((name + ":").padEnd(size + gap + 1)),
      value,
      br()
    ]));
    term.out.gap();
  };
};

// src/cli/ui/layout/header.ts
var header = (config) => {
  return list({
    App: config.name,
    Stage: config.stage,
    Region: config.region,
    Profile: config.profile
  });
};

// src/util/timer.ts
import hrtime from "pretty-hrtime";
var createTimer = () => {
  const start = process.hrtime();
  return () => {
    const end = process.hrtime(start);
    const [time, unit] = hrtime(end).split(" ");
    return style.attr(time) + style.attr.dim(unit);
  };
};

// src/cli/lib/signal.ts
var Signal = class {
  constructor(value) {
    this.value = value;
  }
  subs = /* @__PURE__ */ new Set();
  get() {
    return this.value;
  }
  set(value) {
    this.value = value;
    this.subs.forEach((sub2) => sub2(value));
  }
  update(cb) {
    this.set(cb(this.value));
  }
  subscribe(cb) {
    this.subs.add(cb);
    return () => {
      this.subs.delete(cb);
    };
  }
};
var derive = (deps, factory) => {
  const values = deps.map((dep) => dep.get());
  const signal = new Signal(factory(...values));
  deps.forEach((dep) => {
    dep.subscribe(() => {
      const values2 = deps.map((dep2) => dep2.get());
      signal.set(factory(...values2));
    });
  });
  return signal;
};

// src/cli/ui/layout/spinner.ts
var frames = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var length = frames.length;
var createSpinner = () => {
  const index = new Signal(0);
  const frame = derive([index], (index2) => style.info(frames[index2 % length]));
  const interval = setInterval(() => {
    index.update((i) => i + 1);
  }, 80);
  return [
    frame,
    () => {
      clearInterval(interval);
    }
  ];
};

// src/cli/ui/layout/dialog.ts
import wrapAnsi from "wrap-ansi";
var dialog = (type, lines) => {
  const padding = 3;
  const icon = style[type](symbol[type].padEnd(padding));
  return (term) => {
    term.out.write(lines.map((line, i) => {
      if (i === 0) {
        return icon + wrapAnsi(line, term.out.width(), { hard: true });
      }
      return wrapAnsi(" ".repeat(padding) + line, term.out.width(), { hard: true });
    }).join(br()) + br());
  };
};
var loadingDialog = (message) => {
  const [icon, stop] = createSpinner();
  const description = new Signal(message);
  const time = new Signal("");
  const timer = createTimer();
  return (term) => {
    term.out.write([
      icon,
      "  ",
      description,
      " ",
      time,
      br()
    ]);
    return (message2) => {
      description.set(message2);
      time.set(timer());
      stop();
      icon.set(style.success(symbol.success));
    };
  };
};

// src/cli/lib/interface.ts
import { createInterface, emitKeypressEvents } from "readline";
import { exec } from "child_process";
var parseAction = (key) => {
  if (key.meta && key.name !== "escape") {
    return;
  }
  if (key.ctrl) {
    if (key.name === "a")
      return "first";
    if (key.name === "c")
      return "abort";
    if (key.name === "d")
      return "abort";
    if (key.name === "e")
      return "last";
    if (key.name === "g")
      return "reset";
  }
  if (key.name === "return")
    return "submit";
  if (key.name === "enter")
    return "submit";
  if (key.name === "backspace")
    return "delete";
  if (key.name === "delete")
    return "deleteForward";
  if (key.name === "abort")
    return "abort";
  if (key.name === "escape")
    return "exit";
  if (key.name === "tab" && key.shift)
    return "previous";
  if (key.name === "tab")
    return "next";
  if (key.name === "up")
    return "up";
  if (key.name === "down")
    return "down";
  if (key.name === "right")
    return "right";
  if (key.name === "left")
    return "left";
  return "input";
};
var Interface = class {
  constructor(input) {
    this.input = input;
    this.readline = createInterface({ input: this.input, escapeCodeTimeout: 50 });
    emitKeypressEvents(this.input, this.readline);
    this.hideCursor();
    if (this.input.isTTY) {
      this.input.setRawMode(true);
    }
    this.input.on("keypress", (_, key) => {
      const action = parseAction(key);
      if (action === "abort") {
        this.unref();
        process.exit(1);
      }
    });
  }
  // private subscriber: Actions | undefined
  readline;
  unref() {
    this.showCursor();
    this.input.unref();
  }
  captureInput(actions) {
    debug("Subscribe to user input...");
    const keypress = (value, key) => {
      const action = parseAction(key);
      if (typeof action === "undefined") {
        this.bell();
      } else {
        const cb = actions[action];
        if (typeof cb === "function") {
          cb(value, key);
        } else {
          this.bell();
        }
      }
    };
    this.input.on("keypress", keypress);
    return () => {
      this.input.off("keypress", keypress);
      debug("Unsubscribe to user input");
    };
  }
  hideCursor() {
    if (this.input.isTTY) {
      this.input.write("\x1B[?25l");
    }
  }
  showCursor() {
    if (this.input.isTTY) {
      this.input.write("\x1B[?25h");
    }
  }
  bell() {
    if (this.input.isTTY) {
      exec("afplay /System/Library/Sounds/Tink.aiff");
    }
  }
};

// src/cli/lib/renderer.ts
var Renderer = class {
  constructor(output, ins) {
    this.output = output;
    this.ins = ins;
  }
  fragments = [];
  unsubs = [];
  timeout;
  flushing = false;
  screen = [];
  width() {
    return this.output.columns;
  }
  height() {
    return this.output.rows;
  }
  write(fragment) {
    if (Array.isArray(fragment)) {
      fragment.forEach((i) => this.write(i));
      return;
    }
    if (typeof fragment === "function") {
      return fragment({ out: this, in: this.ins });
    }
    this.fragments.push(fragment);
    this.update();
    return fragment;
  }
  gap() {
    const walk = (fragment) => {
      if (typeof fragment === "string") {
        return fragment;
      }
      if (Array.isArray(fragment)) {
        return fragment.map(walk).join("");
      }
      return walk(fragment.get());
    };
    const end = walk(this.fragments.slice(-2));
    if (end.endsWith("\n\n")) {
    } else if (end.endsWith("\n")) {
      this.fragments.push("\n");
    } else {
      this.fragments.push("\n\n");
    }
    this.update();
  }
  update() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.flush();
    }, 0);
  }
  async end() {
    this.gap();
    await this.flush();
    clearTimeout(this.timeout);
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
    const y = this.screen.length - 1;
    await this.setCursor(0, y);
  }
  setCursor(x, y) {
    return new Promise((resolve) => {
      this.output.cursorTo?.(x, y, () => resolve(void 0));
    });
  }
  writeString(value) {
    return new Promise((resolve) => {
      this.output.write?.(value, () => resolve(void 0));
    });
  }
  clearLine() {
    return new Promise((resolve) => {
      this.output.clearLine?.(1, () => resolve(void 0));
    });
  }
  async flush() {
    clearTimeout(this.timeout);
    if (this.flushing) {
      this.update();
      return;
    }
    const walk = (fragment) => {
      if (typeof fragment === "string") {
        return fragment;
      }
      if (Array.isArray(fragment)) {
        return fragment.map(walk).join("");
      }
      this.unsubs.push(fragment.subscribe(() => {
        this.update();
      }));
      return walk(fragment.get());
    };
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
    const screen = walk(this.fragments).split("\n");
    const height = this.height();
    const oldSize = this.screen.length;
    const newSize = screen.length;
    const size = Math.max(oldSize, newSize);
    const start = Math.max(oldSize - height, 0);
    this.flushing = true;
    for (let y = start; y < size; y++) {
      const newLine = screen[y];
      const oldLine = this.screen[y];
      if (newLine !== oldLine) {
        if (y >= oldSize && y !== 0) {
          const p = y - start - 1;
          const x = screen[y - 1]?.length || 0;
          await this.setCursor(x, p);
          await this.writeString("\n" + newLine);
        } else {
          await this.setCursor(0, y - start);
          await this.writeString(newLine);
          await this.clearLine();
        }
      }
    }
    this.screen = screen;
    this.flushing = false;
  }
  async clear() {
    await this.setCursor(0, 0);
    await this.writeString("\n".repeat(this.height()));
    await this.setCursor(0, 0);
    if (this.output.clearScreenDown) {
      await new Promise((resolve) => {
        this.output.clearScreenDown(() => resolve(void 0));
      });
    }
  }
};

// src/cli/lib/terminal.ts
var createTerminal = (input = process.stdin, output = process.stdout) => {
  const ins = new Interface(input);
  const outs = new Renderer(output, ins);
  return { in: ins, out: outs };
};

// src/cli/ui/layout/logo.ts
var logo = () => {
  return [
    style.warning("\u26A1\uFE0F "),
    style.primary("AWS"),
    style.primary.dim("LESS")
  ];
};

// src/cli/ui/layout/logs.ts
import wrapAnsi2 from "wrap-ansi";
var previous = /* @__PURE__ */ new Date();
var logs = () => {
  if (!process.env.VERBOSE) {
    return [];
  }
  const logs2 = flushDebug();
  return (term) => {
    term.out.gap();
    term.out.write([
      hr(),
      br(),
      " ".repeat(3),
      style.label("Debug Logs:"),
      br(),
      br(),
      logs2.map((log) => {
        const diff = log.date.getTime() - previous.getTime();
        const time = `+${diff}`.padStart(8);
        previous = log.date;
        return wrapAnsi2([
          style.attr(`${time}${style.attr.dim("ms")}`),
          " [ ",
          log.type,
          " ] ",
          log.message,
          br(),
          log.type === "error" ? br() : ""
        ].join(""), term.out.width(), { hard: true, trim: false });
      }),
      br(),
      hr()
    ]);
  };
};

// src/cli/ui/layout/layout.ts
var layout = async (cb) => {
  const term = createTerminal();
  await term.out.clear();
  term.out.write(br());
  term.out.write(logo());
  term.out.gap();
  try {
    const options = program.optsWithGlobals();
    const config = await importConfig(options);
    term.out.write(header(config));
    term.out.gap();
    await cb(config, term.out.write.bind(term.out), term);
  } catch (error) {
    term.out.gap();
    if (error instanceof Error) {
      term.out.write(dialog("error", [error.message]));
    } else if (typeof error === "string") {
      term.out.write(dialog("error", [error]));
    } else {
      term.out.write(dialog("error", [JSON.stringify(error)]));
    }
    debugError(error);
  } finally {
    debug("Exit");
    term.out.gap();
    term.out.write(logs());
    await term.out.end();
    term.in.unref();
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }
};

// src/cli/ui/complex/builder.ts
import { mkdir as mkdir2, writeFile as writeFile2 } from "fs/promises";

// src/cli/ui/layout/flex-line.ts
var stripEscapeCode = (str) => {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
};
var flexLine = (term, left, right, reserveSpace = 0) => {
  const deps = [...left, ...right];
  const strings = deps.filter((dep) => typeof dep === "string");
  const signals = deps.filter((dep) => dep instanceof Signal);
  const stringSize = stripEscapeCode(strings.join("")).length;
  return new Signal([
    ...left,
    derive(signals, (...deps2) => {
      const signalSize = stripEscapeCode(deps2.join("")).length;
      const size = term.out.width() - signalSize - stringSize - reserveSpace;
      return style.placeholder("\u2500".repeat(size));
    }),
    ...right
  ]);
};

// src/cli/ui/complex/builder.ts
import { dirname as dirname2, join as join4 } from "path";
var assetBuilder = (app) => {
  return async (term) => {
    const assets = [];
    const stacks = [];
    for (const stack of app) {
      for (const asset of stack.assets) {
        if (asset.build) {
          assets.push(asset);
          stacks.push(stack);
        }
      }
    }
    if (assets.length === 0) {
      return;
    }
    const done = term.out.write(loadingDialog("Building stack assets..."));
    const groups = new Signal([""]);
    term.out.gap();
    term.out.write(groups);
    const stackNameSize = Math.max(...stacks.map((stack) => stack.name.length));
    const assetTypeSize = Math.max(...assets.map((asset) => asset.type.length));
    await Promise.all(app.stacks.map(async (stack) => {
      const group = new Signal([]);
      groups.update((groups2) => [...groups2, group]);
      await Promise.all([...stack.assets].map(async (asset) => {
        if (!asset.build) {
          return;
        }
        const [icon, stop] = createSpinner();
        const details = new Signal({});
        const line = flexLine(term, [
          icon,
          "  ",
          style.label(stack.name),
          " ".repeat(stackNameSize - stack.name.length),
          " ",
          style.placeholder(symbol.pointerSmall),
          " ",
          style.warning(asset.type),
          " ".repeat(assetTypeSize - asset.type.length),
          " ",
          style.placeholder(symbol.pointerSmall),
          " ",
          style.info(asset.id),
          " "
        ], [
          " ",
          derive([details], (details2) => {
            return Object.entries(details2).map(([key, value]) => {
              return `${style.label(key)} ${value}`;
            }).join(style.placeholder(" \u2500 "));
          }),
          br()
        ]);
        group.update((group2) => [...group2, line]);
        const timer = createTimer();
        const data = await asset.build({
          async write(file, data2) {
            const fullpath = join4(directories.asset, asset.type, app.name, stack.name, asset.id, file);
            const basepath = dirname2(fullpath);
            await mkdir2(basepath, { recursive: true });
            await writeFile2(fullpath, data2);
          }
        });
        details.set({
          ...data,
          time: timer()
        });
        icon.set(style.success(symbol.success));
        stop();
      }));
    }));
    done("Done building stack assets");
    term.out.gap();
  };
};

// src/util/cleanup.ts
import { mkdir as mkdir3, rm } from "fs/promises";
var cleanUp = async () => {
  debug("Clean up template, cache, and asset files");
  const paths = [
    directories.asset,
    directories.cache,
    directories.template
  ];
  await Promise.all(paths.map((path) => rm(path, {
    recursive: true,
    force: true,
    maxRetries: 2
  })));
  await Promise.all(paths.map((path) => mkdir3(path, {
    recursive: true
  })));
};

// src/cli/ui/complex/template.ts
import { mkdir as mkdir4, writeFile as writeFile3 } from "fs/promises";
import { join as join5 } from "path";
var templateBuilder = (app) => {
  return async (term) => {
    const done = term.out.write(loadingDialog("Building stack templates..."));
    await Promise.all(app.stacks.map(async (stack) => {
      const template = stack.toString(true);
      const path = join5(directories.template, app.name);
      const file = join5(path, `${stack.name}.json`);
      await mkdir4(path, { recursive: true });
      await writeFile3(file, template);
    }));
    done("Done building stack templates");
  };
};

// src/cli/command/build.ts
var build = (program2) => {
  program2.command("build").argument("[stack...]", "Optionally filter stacks to build").description("Build your app").action(async (filters) => {
    await layout(async (config, write) => {
      const { app } = await toApp(config, filters);
      await cleanUp();
      await write(assetBuilder(app));
      await write(templateBuilder(app));
    });
  });
};

// src/formation/bootstrap.ts
var assetBucketName = (account, region) => {
  return `awsless-bootstrap-${account}-${region}`;
};
var assetBucketUrl = (account, region, stack) => {
  const bucket = assetBucketName(account, region);
  return `https://s3-${region}.amazonaws.com/${bucket}/${stack.name}/cloudformation.json`;
};
var version = "1";
var bootstrapStack = (account, region) => {
  const app = new App("awsless");
  const stack = new Stack("bootstrap", region);
  stack.add(new Bucket("assets", {
    name: assetBucketName(account, region),
    accessControl: "private",
    versioned: true
  }));
  stack.export("version", version);
  app.add(stack);
  return { app, stack };
};
var shouldDeployBootstrap = async (client, stack) => {
  debug("Check bootstrap status");
  const info = await client.get(stack.name, stack.region);
  return !info || info.outputs.version !== version || !["CREATE_COMPLETE", "UPDATE_COMPLETE"].includes(info.status);
};

// src/formation/client.ts
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand, GetTemplateCommand, OnFailure, TemplateStage, UpdateStackCommand, ValidateTemplateCommand, waitUntilStackCreateComplete, waitUntilStackDeleteComplete, waitUntilStackUpdateComplete } from "@aws-sdk/client-cloudformation";
import { S3Client, PutObjectCommand, ObjectCannedACL, StorageClass } from "@aws-sdk/client-s3";
import { paramCase as paramCase4 } from "change-case";
var StackClient = class {
  constructor(app, account, region, credentials) {
    this.app = app;
    this.account = account;
    this.region = region;
    this.credentials = credentials;
    this.assetBucketName = assetBucketName(this.account, this.region);
  }
  maxWaitTime = 60 * 30;
  // 30 minutes
  maxDelay = 30;
  // 30 seconds
  assetBucketName;
  getClient(region) {
    return new CloudFormationClient({
      credentials: this.credentials,
      region
    });
  }
  shouldUploadTemplate(template) {
    const size = Buffer.byteLength(template, "utf8");
    return size > 5e4;
  }
  templateProp(stack) {
    const template = stack.toString();
    return this.shouldUploadTemplate(template) ? {
      TemplateUrl: assetBucketUrl(this.account, this.region, stack)
    } : {
      TemplateBody: template
    };
  }
  stackName(stackName) {
    return paramCase4(`${this.app.name}-${stackName}`);
  }
  tags(stack) {
    const tags = [];
    for (const [name, value] of stack.tags.entries()) {
      tags.push({ Key: name, Value: value });
    }
    return tags;
  }
  async upload(stack, template) {
    debug("Upload the", style.info(stack.name), "stack to awsless assets bucket");
    const client = new S3Client({
      credentials: this.credentials,
      region: stack.region
    });
    await client.send(new PutObjectCommand({
      Bucket: this.assetBucketName,
      Key: `${this.app.name}/${stack.name}/cloudformation.json`,
      Body: template,
      ACL: ObjectCannedACL.private,
      StorageClass: StorageClass.STANDARD_IA
    }));
  }
  async create(stack, capabilities) {
    debug("Create the", style.info(stack.name), "stack");
    const client = this.getClient(stack.region);
    await client.send(new CreateStackCommand({
      StackName: this.stackName(stack.name),
      EnableTerminationProtection: false,
      OnFailure: OnFailure.DELETE,
      Capabilities: capabilities,
      Tags: this.tags(stack),
      ...this.templateProp(stack)
    }));
    await waitUntilStackCreateComplete({
      client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: this.stackName(stack.name)
    });
  }
  async update(stack, capabilities) {
    debug("Update the", style.info(stack.name), "stack");
    const client = this.getClient(stack.region);
    try {
      await client.send(new UpdateStackCommand({
        StackName: this.stackName(stack.name),
        Capabilities: capabilities,
        Tags: this.tags(stack),
        ...this.templateProp(stack)
      }));
      await waitUntilStackUpdateComplete({
        client,
        maxWaitTime: this.maxWaitTime,
        maxDelay: this.maxDelay
      }, {
        StackName: this.stackName(stack.name)
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ValidationError" && error.message.toLowerCase().includes("no updates")) {
        return;
      }
      throw error;
    }
  }
  async validate(stack) {
    debug("Validate the", style.info(stack.name), "stack");
    const client = this.getClient(stack.region);
    const result = await client.send(new ValidateTemplateCommand({
      ...this.templateProp(stack)
    }));
    return result.Capabilities;
  }
  async get(name, region) {
    debug("Get stack info for:", style.info(name));
    const client = this.getClient(region);
    let result;
    try {
      result = await client.send(new DescribeStacksCommand({
        StackName: this.stackName(name)
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "ValidationError" && error.message.includes("does not exist")) {
        debug("Stack not found");
        return;
      }
      throw error;
    }
    const stack = result.Stacks?.[0];
    if (!stack) {
      debug("Stack not found");
      return;
    }
    const resultTemplate = await client.send(new GetTemplateCommand({
      StackName: this.stackName(name),
      TemplateStage: TemplateStage.Original
    }));
    const outputs = {};
    stack.Outputs?.forEach((output) => {
      outputs[output.OutputKey] = output.OutputValue;
    });
    debug("Status for:", style.info(name), "is", style.attr(stack.StackStatus));
    return {
      status: stack.StackStatus,
      reason: stack.StackStatusReason,
      outputs,
      template: resultTemplate.TemplateBody,
      updatedAt: stack.LastUpdatedTime || stack.CreationTime,
      createdAt: stack.CreationTime
    };
  }
  async deploy(stack) {
    const template = stack.toString();
    const data = await this.get(stack.name, stack.region);
    debug("Deploy:", style.info(stack.name));
    if (data?.template === template) {
      debug("No stack changes");
      return false;
    }
    if (this.shouldUploadTemplate(template)) {
      await this.upload(stack, template);
    }
    const capabilities = await this.validate(stack);
    if (!data) {
      await this.create(stack, capabilities);
    } else if (data.status.includes("IN_PROGRESS")) {
      throw new Error(`Stack is in progress: ${data.status}`);
    } else {
      await this.update(stack, capabilities);
    }
    return true;
  }
  async delete(name, region) {
    const data = await this.get(name, region);
    const client = this.getClient(region);
    debug("Delete the", style.info(name), "stack");
    if (!data) {
      debug("Already deleted");
      return;
    }
    await client.send(new DeleteStackCommand({
      StackName: this.stackName(name)
    }));
    await waitUntilStackDeleteComplete({
      client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: this.stackName(name)
    });
  }
};

// src/cli/error.ts
var Cancelled = class extends Error {
  constructor() {
    super("Cancelled");
  }
};

// src/cli/ui/prompt/toggle.ts
var togglePrompt = (label, options = {}) => {
  return (term) => new Promise((resolve) => {
    const { initial = false, active = "on", inactive = "off" } = options;
    const icon = new Signal(style.info(symbol.question));
    const sep = new Signal(style.placeholder(symbol.pointerSmall));
    const mid = style.placeholder("/");
    const activeText = new Signal(active);
    const inactiveText = new Signal(inactive);
    let value = initial;
    const activate = () => {
      activeText.set(style.success.underline(active));
      inactiveText.set(style.normal(inactive));
      value = true;
    };
    const deactivate = () => {
      activeText.set(style.normal(active));
      inactiveText.set(style.success.underline(inactive));
      value = false;
    };
    const toggle = () => {
      !value ? activate() : deactivate();
    };
    const reset = () => {
      initial ? activate() : deactivate();
    };
    reset();
    const release = term.in.captureInput({
      reset,
      exit() {
        release();
        icon.set(style.error(symbol.error));
        sep.set(symbol.ellipsis);
        resolve(false);
      },
      submit() {
        release();
        icon.set(style.success(symbol.success));
        sep.set(symbol.ellipsis);
        resolve(value);
      },
      input(chr) {
        switch (chr) {
          case " ":
            toggle();
            break;
          case "1":
            activate();
            break;
          case "0":
            deactivate();
            break;
        }
      },
      delete: deactivate,
      left: deactivate,
      right: activate,
      down: deactivate,
      up: activate
    });
    term.out.write([icon, "  ", style.label(label), " ", sep, " ", inactiveText, " ", mid, " ", activeText, br()]);
  });
};

// src/cli/ui/prompt/confirm.ts
var confirmPrompt = (label, options = {}) => {
  return togglePrompt(label, {
    ...options,
    inactive: "no",
    active: "yes"
  });
};

// src/cli/ui/complex/bootstrap.ts
var bootstrapDeployer = (config) => {
  return async (term) => {
    debug("Initializing bootstrap");
    const { app, stack } = bootstrapStack(config.account, config.region);
    const client = new StackClient(app, config.account, config.region, config.credentials);
    const shouldDeploy = await shouldDeployBootstrap(client, stack);
    if (shouldDeploy) {
      term.out.write(dialog("warning", [`Your app hasn't been bootstrapped yet`]));
      const confirmed = await term.out.write(confirmPrompt("Would you like to bootstrap?"));
      if (!confirmed) {
        throw new Cancelled();
      }
      const done = term.out.write(loadingDialog("Bootstrapping..."));
      await client.deploy(stack);
      done("Done deploying the bootstrap stack");
    } else {
      term.out.write(dialog("success", [
        "App has already been bootstrapped"
      ]));
    }
    debug("Bootstrap initialized");
  };
};

// src/cli/command/bootstrap.ts
var bootstrap = (program2) => {
  program2.command("bootstrap").description("Create the awsless bootstrap stack").action(async () => {
    await layout(async (config, write) => {
      await write(bootstrapDeployer(config));
    });
  });
};

// src/cli/ui/complex/stack-tree.ts
var stackTree = (nodes, statuses) => {
  return (term) => {
    const render = (nodes2, deep = 0, parents = []) => {
      const size = nodes2.length - 1;
      nodes2.forEach((node, i) => {
        const name = node.stack.name;
        const status2 = statuses[name];
        const first = i === 0 && deep === 0;
        const last = i === size;
        const more = i < size;
        const line = flexLine(term, [
          ...parents.map((parent) => {
            return style.label(
              parent ? "\u2502".padEnd(3) : " ".repeat(3)
            );
          }),
          style.label(
            first && size === 0 ? "  " : first ? "\u250C\u2500" : last ? "\u2514\u2500" : "\u251C\u2500"
          ),
          " ",
          style.info(name),
          " "
        ], [
          " ",
          status2,
          br()
        ]);
        term.out.write(line);
        render(node.children, deep + 1, [...parents, more]);
      });
    };
    term.out.gap();
    render(nodes);
    term.out.gap();
  };
};

// src/cli/command/status.ts
var status = (program2) => {
  program2.command("status").argument("[stacks...]", "Optionally filter stacks to lookup status").description("View the application status").action(async (filters) => {
    await layout(async (config, write) => {
      const { app, dependencyTree } = await toApp(config, filters);
      await cleanUp();
      await write(assetBuilder(app));
      await write(templateBuilder(app));
      const doneLoading = write(loadingDialog("Loading stack information..."));
      const client = new StackClient(app, config.account, config.region, config.credentials);
      const statuses = [];
      const stackStatuses = {};
      for (const stack of app) {
        stackStatuses[stack.name] = new Signal(style.info("Loading..."));
      }
      write(stackTree(dependencyTree, stackStatuses));
      debug("Load metadata for all deployed stacks on AWS");
      await Promise.all(app.stacks.map(async (stack, i) => {
        const info = await client.get(stack.name, stack.region);
        const signal = stackStatuses[stack.name];
        await new Promise((resolve) => setTimeout(resolve, i * 1e3));
        if (!info) {
          signal.set(style.error("non-existent"));
          statuses.push("non-existent");
        } else if (info.template !== stack.toString()) {
          signal.set(style.warning("out-of-date"));
          statuses.push("out-of-date");
        } else {
          signal.set(style.success("up-to-date"));
          statuses.push("up-to-date");
        }
      }));
      doneLoading("Done loading stack information");
      debug("Done loading data for all deployed stacks on AWS");
      if (statuses.includes("non-existent") || statuses.includes("out-of-date")) {
        write(dialog("warning", ["Your app has undeployed changes !!!"]));
      } else {
        write(dialog("success", ["Your app has not been changed"]));
      }
    });
  });
};

// src/cli/ui/complex/publisher.ts
import { readFile as readFile3 } from "fs/promises";
import { join as join6 } from "path";
import { GetObjectCommand, ObjectCannedACL as ObjectCannedACL2, PutObjectCommand as PutObjectCommand2, S3Client as S3Client2, StorageClass as StorageClass2 } from "@aws-sdk/client-s3";
var assetPublisher = (config, app) => {
  const client = new S3Client2({
    credentials: config.credentials,
    region: config.region
  });
  return async (term) => {
    const done = term.out.write(loadingDialog("Publishing stack assets to AWS..."));
    await Promise.all(app.stacks.map(async (stack) => {
      await Promise.all([...stack.assets].map(async (asset) => {
        await asset.publish?.({
          async read(file) {
            const path = join6(directories.asset, asset.type, app.name, stack.name, asset.id, file);
            const data = await readFile3(path);
            return data;
          },
          async publish(name, data, hash) {
            const key = `${app.name}/${stack.name}/function/${name}`;
            const bucket = assetBucketName(config.account, config.region);
            let getResult;
            try {
              getResult = await client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
              }));
            } catch (error) {
              if (error instanceof Error && error.name === "NoSuchKey") {
              } else {
                throw error;
              }
            }
            if (getResult?.Metadata?.hash === hash) {
              return {
                bucket,
                key,
                version: getResult.VersionId
              };
            }
            const putResult = await client.send(new PutObjectCommand2({
              Bucket: bucket,
              Key: key,
              Body: data,
              ACL: ObjectCannedACL2.private,
              StorageClass: StorageClass2.STANDARD,
              Metadata: {
                hash
              }
            }));
            return {
              bucket,
              key,
              version: putResult.VersionId
            };
          }
        });
      }));
    }));
    done("Done publishing stack assets to AWS");
  };
};

// src/cli/command/deploy.ts
var deploy = (program2) => {
  program2.command("deploy").argument("[stacks...]", "Optionally filter stacks to deploy").description("Deploy your app to AWS").action(async (filters) => {
    await layout(async (config, write) => {
      await write(bootstrapDeployer(config));
      const { app, dependencyTree } = await toApp(config, filters);
      const stackNames = app.stacks.map((stack) => stack.name);
      const formattedFilter = stackNames.map((i) => style.info(i)).join(style.placeholder(", "));
      debug("Stacks to deploy", formattedFilter);
      const deployAll = filters.length === 0;
      const deploySingle = filters.length === 1;
      const confirm = await write(confirmPrompt(deployAll ? `Are you sure you want to deploy ${style.warning("all")} stacks?` : deploySingle ? `Are you sure you want to deploy the ${formattedFilter} stack?` : `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`));
      if (!confirm) {
        throw new Cancelled();
      }
      await cleanUp();
      await write(assetBuilder(app));
      await write(assetPublisher(config, app));
      await write(templateBuilder(app));
      const statuses = {};
      for (const stack of app) {
        statuses[stack.name] = new Signal(style.info("waiting"));
      }
      const doneDeploying = write(loadingDialog("Deploying stacks to AWS..."));
      write(stackTree(dependencyTree, statuses));
      const client = new StackClient(app, config.account, config.region, config.credentials);
      const deploymentLine = createDeploymentLine(dependencyTree);
      for (const stacks of deploymentLine) {
        const results = await Promise.allSettled(stacks.map(async (stack) => {
          const signal = statuses[stack.name];
          signal.set(style.warning("deploying"));
          try {
            await client.deploy(stack);
          } catch (error) {
            debugError(error);
            signal.set(style.error("failed"));
            throw error;
          }
          signal.set(style.success("deployed"));
        }));
        for (const result of results) {
          if (result.status === "rejected") {
            throw result.reason;
          }
        }
      }
      doneDeploying("Done deploying stacks to AWS");
    });
  });
};

// src/cli/ui/prompt/text.ts
var textPrompt = (label, options = {}) => {
  return (term) => {
    return new Promise((resolve) => {
      const done = new Signal(false);
      const cursor = new Signal(0);
      const icon = new Signal(style.info(symbol.question));
      const value = new Signal([]);
      const custom = derive([value], options.renderer ?? ((value2) => value2));
      const formatted = derive([custom, cursor, done], (value2, cursor2, done2) => {
        if (done2) {
          return value2.join("");
        }
        return [...value2, " "].map((chr, i) => {
          return i === cursor2 ? style.cursor(chr) : chr;
        }).join("");
      });
      const sep = new Signal(style.placeholder(symbol.pointerSmall));
      const release = term.in.captureInput({
        reset() {
          value.set([]);
          cursor.set(0);
        },
        exit() {
          release();
          done.set(true);
          icon.set(style.success(symbol.success));
          sep.set(symbol.ellipsis);
          value.set([]);
          resolve("");
        },
        submit() {
          release();
          done.set(true);
          icon.set(style.success(symbol.success));
          sep.set(symbol.ellipsis);
          resolve(value.get().join(""));
        },
        input: (chr) => {
          value.update((value2) => [
            ...value2.slice(0, cursor.get()),
            chr,
            ...value2.slice(cursor.get())
          ]);
          cursor.update((cursor2) => cursor2 + 1);
        },
        delete() {
          value.update((value2) => [...value2].filter((_, i) => i !== cursor.get() - 1));
          cursor.update((cursor2) => Math.max(0, cursor2 - 1));
        },
        left() {
          cursor.update((cursor2) => Math.max(0, cursor2 - 1));
        },
        right() {
          cursor.update((cursor2) => Math.min(value.get().length, cursor2 + 1));
        }
      });
      term.out.write([icon, "  ", style.label(label), " ", sep, " ", formatted, br()]);
    });
  };
};

// src/cli/command/secrets/set.ts
var set = (program2) => {
  program2.command("set <name>").description("Set a secret value").action(async (name) => {
    await layout(async (config, write) => {
      const params = new Params(config);
      write(list({
        "Set secret parameter": style.info(name)
      }));
      const value = await write(textPrompt("Enter secret value"));
      if (value === "") {
        write(dialog("error", [`Provided secret value can't be empty`]));
      } else {
        const done = write(loadingDialog(`Saving remote secret parameter`));
        await params.set(name, value);
        done(`Done saving remote secret parameter`);
      }
    });
  });
};

// src/cli/command/secrets/get.ts
var get = (program2) => {
  program2.command("get <name>").description("Get a secret value").action(async (name) => {
    await layout(async (config, write) => {
      const params = new Params(config);
      const done = write(loadingDialog(`Getting remote secret parameter`));
      const value = await params.get(name);
      done(`Done getting remote secret parameter`);
      write(list({
        Name: name,
        Value: value || style.error("(empty)")
      }));
    });
  });
};

// src/cli/command/secrets/delete.ts
var del = (program2) => {
  program2.command("delete <name>").description("Delete a secret value").action(async (name) => {
    await layout(async (config, write) => {
      const params = new Params(config);
      write(dialog("warning", [`Your deleting the ${style.info(name)} secret parameter`]));
      const confirm = await write(confirmPrompt("Are you sure?"));
      if (!confirm) {
        throw new Cancelled();
      }
      const done = write(loadingDialog(`Deleting remote secret parameter`));
      const value = await params.get(name);
      await params.delete(name);
      done(`Done deleting remote secret parameter`);
      write(list({
        Name: name,
        Value: value || style.error("(empty)")
      }));
    });
  });
};

// src/cli/command/secrets/list.ts
var list2 = (program2) => {
  program2.command("list").description(`List all secret value's`).action(async () => {
    await layout(async (config, write) => {
      const params = new Params(config);
      const done = write(loadingDialog("Loading secret parameters..."));
      const values = await params.list();
      done("Done loading secret values");
      if (Object.keys(values).length > 0) {
        write(list(values));
      } else {
        write(dialog("warning", ["No secret parameters found"]));
      }
    });
  });
};

// src/cli/command/secrets/index.ts
var commands = [
  set,
  get,
  del,
  list2
];
var secrets = (program2) => {
  const command = program2.command("secrets").description(`Manage app secrets`);
  commands.forEach((cb) => cb(command));
};

// src/cli/command/test.ts
var test = (program2) => {
  program2.command("test").action(async () => {
    await layout(async (config) => {
      const app = new App("test");
      const name = "test5";
    });
  });
};

// src/cli/program.ts
var program = new Command();
program.name(logo().join("").replace(/\s+/, ""));
program.option("--config-file <string>", "The config file location");
program.option("--stage <string>", "The stage to use, defaults to prod stage", "prod");
program.option("--profile <string>", "The AWS profile to use");
program.option("--region <string>", "The AWS region to use");
program.option("-m --mute", "Mute sound effects");
program.option("-v --verbose", "Print verbose logs");
program.exitOverride(() => {
  process.exit(0);
});
program.on("option:verbose", () => {
  process.env.VERBOSE = program.opts().verbose ? "1" : void 0;
});
var commands2 = [
  bootstrap,
  status,
  build,
  deploy,
  secrets,
  test
  // diff,
  // remove,
];
commands2.forEach((fn) => fn(program));

// src/bin.ts
program.parse(process.argv);
