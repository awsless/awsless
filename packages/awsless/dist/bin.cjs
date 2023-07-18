#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/cli/program.ts
var import_commander = require("commander");

// src/app.ts
var import_aws_cdk_lib5 = require("aws-cdk-lib");

// src/stack.ts
var import_aws_cdk_lib = require("aws-cdk-lib");
var import_aws_iam = require("aws-cdk-lib/aws-iam");

// src/cli/style.ts
var import_chalk = __toESM(require("chalk"), 1);
var style = {
  primary: import_chalk.default.bold.hex("#FF9000"),
  // title: chalk.white,
  normal: import_chalk.default.white,
  label: import_chalk.default.white.bold,
  placeholder: import_chalk.default.dim,
  link: import_chalk.default.cyan,
  info: import_chalk.default.blue,
  success: import_chalk.default.green,
  warning: import_chalk.default.yellow,
  error: import_chalk.default.red,
  time: import_chalk.default.yellow,
  cursor: import_chalk.default.bgWhite.blackBright
};
var symbol = {
  // arrowUp: '↑',
  // arrowDown: '↓',
  // arrowLeft: '←',
  // arrowRight: '→',
  // radioOn: '◉',
  // radioOff: '◯',
  info: "\u2139",
  success: "\u2714",
  warning: "\u26A0",
  question: "?",
  error: "\u2716",
  ellipsis: "\u2026",
  pointerSmall: "\u203A",
  // line: '─',
  pointer: "\u276F"
  // info: style.info('ℹ'),
  // success: style.success('✔'),
  // warning: style.warning('⚠'),
  // error: style.error('✖'),
  // input: style.success('?')
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
var import_client_ssm = require("@aws-sdk/client-ssm");
var configParameterPrefix = (config2) => {
  return `/${config2.stage}/awsless/${config2.name}`;
};
var Params = class {
  constructor(config2) {
    this.config = config2;
    this.client = new import_client_ssm.SSMClient({
      credentials: config2.credentials,
      region: config2.region
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
      result = await this.client.send(new import_client_ssm.GetParameterCommand({
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
    await this.client.send(new import_client_ssm.PutParameterCommand({
      Type: import_client_ssm.ParameterType.STRING,
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
      await this.client.send(new import_client_ssm.DeleteParameterCommand({
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
    const result = await this.client.send(new import_client_ssm.GetParametersByPathCommand({
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

// src/stack.ts
var toStack = ({ config: config2, assets, app, stackConfig, plugins }) => {
  const stackName = `${config2.name}-${stackConfig.name}`;
  const stack = new import_aws_cdk_lib.Stack(app, stackConfig.name, {
    stackName,
    tags: {
      APP: config2.name,
      STAGE: config2.stage,
      STACK: stackConfig.name
    }
  });
  debug("Define stack:", style.info(stackConfig.name));
  const bindings = [];
  const bind = (cb) => {
    bindings.push(cb);
  };
  const functions = plugins.map((plugin) => plugin.onStack?.({
    config: config2,
    assets,
    app,
    stack,
    stackConfig,
    bind
  })).flat().filter((lambda) => !!lambda);
  bindings.forEach((cb) => functions.forEach(cb));
  const allowTopicPublish = new import_aws_iam.PolicyStatement({
    actions: ["sns:publish"],
    resources: ["*"]
  });
  functions.forEach((lambda) => lambda.addToRolePolicy(allowTopicPublish));
  const allowConfigParameters = new import_aws_iam.PolicyStatement({
    actions: [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ],
    resources: [
      import_aws_cdk_lib.Fn.sub("arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter" + configParameterPrefix(config2))
    ]
  });
  functions.forEach((lambda) => lambda.addToRolePolicy(allowConfigParameters));
  return {
    stack,
    depends: stackConfig.depends
  };
};

// src/util/path.ts
var import_path = require("path");
var rootDir = process.cwd();
var outDir = (0, import_path.join)(rootDir, ".awsless");
var assemblyDir = (0, import_path.join)(outDir, "assembly");
var functionDir = (0, import_path.join)(outDir, "function");

// src/stack/global.ts
var import_aws_cdk_lib3 = require("aws-cdk-lib");
var import_aws_sns = require("aws-cdk-lib/aws-sns");

// src/util/resource.ts
var import_aws_cdk_lib2 = require("aws-cdk-lib");
var import_change_case = require("change-case");
var toId = (resource, id) => {
  return (0, import_change_case.pascalCase)(`${resource}-${id}`);
};
var toName = (stack, id) => {
  return (0, import_change_case.paramCase)(`${stack.stackName}-${id}`);
};

// src/stack/global.ts
var findAllTopicIds = (config2) => {
  return [...new Set(config2.stacks.map(
    (stack) => Object.keys(stack.topics || {})
  ).flat())];
};
var globalStack = (config2, app) => {
  const stack = new import_aws_cdk_lib3.Stack(app, "global", {
    stackName: `${config2.name}-global`
  });
  findAllTopicIds(config2).map((id) => {
    new import_aws_sns.Topic(stack, toId("topic", id), {
      topicName: id,
      displayName: id
    });
  });
  return stack;
};

// src/stack/bootstrap.ts
var import_aws_cdk_lib4 = require("aws-cdk-lib");
var import_aws_s3 = require("aws-cdk-lib/aws-s3");
var assetBucketName = (config2) => {
  return `awsless-bootstrap-${config2.account}-${config2.region}`;
};
var assetBucketUrl = (config2, stackName) => {
  const bucket = assetBucketName(config2);
  return `https://s3-${config2.region}.amazonaws.com/${bucket}/${stackName}/cloudformation.json`;
};
var version = "2";
var bootstrapStack = (config2, app) => {
  const stack = new import_aws_cdk_lib4.Stack(app, "bootstrap", {
    stackName: `awsless-bootstrap`
  });
  new import_aws_s3.Bucket(stack, "assets", {
    bucketName: assetBucketName(config2),
    versioned: true,
    accessControl: import_aws_s3.BucketAccessControl.PRIVATE,
    removalPolicy: import_aws_cdk_lib4.RemovalPolicy.DESTROY
  });
  new import_aws_cdk_lib4.CfnOutput(stack, "version", {
    exportName: "version",
    value: version
  });
  return stack;
};
var shouldDeployBootstrap = async (client, name) => {
  debug("Check bootstrap status");
  const info = await client.get(name);
  return !info || info.outputs.version !== version || !["CREATE_COMPLETE", "UPDATE_COMPLETE"].includes(info.status);
};

// src/util/deployment.ts
var flattenDependencyTree = (stacks) => {
  const list3 = [];
  const walk = (stacks2) => {
    stacks2.forEach((node) => {
      list3.push(node);
      walk(node.children);
    });
  };
  walk(stacks);
  return list3;
};
var createDependencyTree = (stacks) => {
  const list3 = stacks.map(({ stack, config: config2 }) => ({
    stack,
    depends: config2?.depends?.map((dep) => dep.name) || []
  }));
  const findChildren = (list4, parents, level) => {
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
        level,
        children: []
      }));
    }
    return children.map(({ stack }) => {
      return {
        stack,
        level,
        children: findChildren(rests, [...parents, stack.artifactId], level + 1)
      };
    });
  };
  return findChildren(list3, [], 1);
};
var createDeploymentLine = (stacks) => {
  const flat = flattenDependencyTree(stacks);
  const line = [];
  flat.forEach((node) => {
    const level = node.level;
    if (!line[level]) {
      line[level] = [];
    }
    line[level].push(node.stack);
  });
  return line;
};

// src/util/assets.ts
var Assets = class {
  assets = {};
  add(opts) {
    if (!this.assets[opts.stack.name]) {
      this.assets[opts.stack.name] = [];
    }
    this.assets[opts.stack.name].push(opts);
  }
  list() {
    return this.assets;
  }
  forEach(cb) {
    Object.values(this.assets).forEach((assets) => {
      cb(assets[0].stack, assets);
    });
  }
  map(cb) {
    return Object.values(this.assets).map((assets) => {
      return cb(assets[0].stack, assets);
    });
  }
};

// src/plugin.ts
var definePlugin = (plugin) => plugin;

// src/resource/function/index.ts
var import_zod7 = require("zod");

// src/schema/duration.ts
var import_zod = require("zod");
var import_core = require("aws-cdk-lib/core");
function toDuration(duration) {
  const [count, unit] = duration.split(" ");
  const countNum = parseInt(count);
  const unitLower = unit.toLowerCase();
  if (unitLower.startsWith("second")) {
    return import_core.Duration.seconds(countNum);
  } else if (unitLower.startsWith("minute")) {
    return import_core.Duration.minutes(countNum);
  } else if (unitLower.startsWith("hour")) {
    return import_core.Duration.hours(countNum);
  } else if (unitLower.startsWith("day")) {
    return import_core.Duration.days(countNum);
  }
  return import_core.Duration.days(0);
}
var DurationSchema = import_zod.z.custom((value) => {
  return import_zod.z.string().regex(/[0-9]+ (seconds?|minutes?|hours?|days?)/, "Invalid duration").refine((duration) => {
    const [str] = duration.split(" ");
    const number = parseInt(str);
    return number > 0;
  }, "Duration must be greater then zero").parse(value);
}).transform(toDuration);

// src/schema/local-file.ts
var import_zod2 = require("zod");
var LocalFileSchema = import_zod2.z.string().refine(async () => {
  return true;
}, `File doesn't exist`);

// src/resource/function/index.ts
var import_aws_lambda3 = require("aws-cdk-lib/aws-lambda");

// src/resource/function/schema/runtime.ts
var import_aws_lambda = require("aws-cdk-lib/aws-lambda");
var import_zod3 = require("zod");
var runtimes = {
  "container": import_aws_lambda.Runtime.FROM_IMAGE,
  "rust": import_aws_lambda.Runtime.PROVIDED_AL2,
  "nodejs16.x": import_aws_lambda.Runtime.NODEJS_16_X,
  "nodejs18.x": import_aws_lambda.Runtime.NODEJS_18_X,
  "python3.9": import_aws_lambda.Runtime.PYTHON_3_9,
  "python3.10": import_aws_lambda.Runtime.PYTHON_3_10,
  "go1.x": import_aws_lambda.Runtime.PROVIDED_AL2,
  "go": import_aws_lambda.Runtime.PROVIDED_AL2
};
var toRuntime = (runtime) => {
  return runtimes[runtime];
};
var RuntimeSchema = import_zod3.z.enum(Object.keys(runtimes)).transform(toRuntime);

// src/resource/function/schema/architecture.ts
var import_aws_lambda2 = require("aws-cdk-lib/aws-lambda");
var import_zod4 = require("zod");
var toArchitecture = (architecture) => {
  return architecture === "x86_64" ? import_aws_lambda2.Architecture.X86_64 : import_aws_lambda2.Architecture.ARM_64;
};
var ArchitectureSchema = import_zod4.z.enum(["x86_64", "arm_64"]).transform(toArchitecture);

// src/schema/resource-id.ts
var import_zod5 = require("zod");
var ResourceIdSchema = import_zod5.z.string().min(3).max(24).regex(/[a-z\-]+/, "Invalid resource ID");

// src/schema/size.ts
var import_core2 = require("aws-cdk-lib/core");
var import_zod6 = require("zod");
function toSize(size) {
  const [count, unit] = size.split(" ");
  const countNum = parseInt(count);
  if (unit === "KB") {
    return import_core2.Size.kibibytes(countNum);
  } else if (unit === "MB") {
    return import_core2.Size.mebibytes(countNum);
  } else if (unit === "GB") {
    return import_core2.Size.gibibytes(countNum);
  }
  throw new TypeError(`Invalid size ${size}`);
}
var SizeSchema = import_zod6.z.custom((value) => {
  return import_zod6.z.string().regex(/[0-9]+ (KB|MB|GB)/, "Invalid size").refine((size) => {
    const [str] = size.split(" ");
    const number = parseInt(str);
    return number > 0;
  }, "Size must be greater then zero").parse(value);
}).transform(toSize);

// src/resource/function/index.ts
var FunctionSchema = import_zod7.z.union([
  LocalFileSchema,
  import_zod7.z.object({
    file: LocalFileSchema,
    timeout: DurationSchema.optional(),
    runtime: RuntimeSchema.optional(),
    memorySize: SizeSchema.optional(),
    architecture: ArchitectureSchema.optional(),
    ephemeralStorageSize: SizeSchema.optional(),
    environment: import_zod7.z.record(import_zod7.z.string(), import_zod7.z.string()).optional()
  }).strict()
]);
var schema = import_zod7.z.object({
  defaults: import_zod7.z.object({
    function: import_zod7.z.object({
      timeout: DurationSchema.optional(),
      runtime: RuntimeSchema.optional(),
      memorySize: SizeSchema.optional(),
      architecture: ArchitectureSchema.optional(),
      ephemeralStorageSize: SizeSchema.optional(),
      environment: import_zod7.z.record(import_zod7.z.string(), import_zod7.z.string()).optional()
      // timeout: DurationSchema.default('10 seconds'),
      // runtime: RuntimeSchema.default('nodejs18.x'),
      // memorySize: SizeSchema.default('124 MB'),
      // architecture: ArchitectureSchema.default('arm_64'),
      // ephemeralStorageSize: SizeSchema.default('512 MB'),
      // environment: z.record(z.string(), z.string()).optional(),
    }).optional()
  }).optional(),
  stacks: import_zod7.z.object({
    functions: import_zod7.z.record(
      ResourceIdSchema,
      FunctionSchema
    ).optional()
  }).array()
});
var functionPlugin = definePlugin({
  name: "function",
  schema,
  onStack(context) {
    return Object.entries(context.stackConfig.functions || {}).map(([id, fileOrProps]) => {
      return toFunction(context, id, fileOrProps);
    });
  }
});
var toFunction = ({ config: config2, stack, stackConfig }, id, fileOrProps) => {
  const props = typeof fileOrProps === "string" ? { ...config2.defaults?.function, file: fileOrProps } : { ...config2.defaults?.function, ...fileOrProps };
  const lambda = new import_aws_lambda3.Function(stack, toId("function", id), {
    functionName: toName(stack, id),
    handler: "index.default",
    code: import_aws_lambda3.Code.fromInline("export default () => {}"),
    timeout: props.timeout ?? toDuration("10 seconds"),
    runtime: props.runtime ?? toRuntime("nodejs18.x"),
    memorySize: (props.memorySize ?? toSize("124 MB")).toMebibytes(),
    architecture: props.architecture ?? toArchitecture("arm_64"),
    ephemeralStorageSize: props.ephemeralStorageSize ?? toSize("512 MB"),
    environment: props.environment
  });
  lambda.addEnvironment("APP", config2.name, { removeInEdge: true });
  lambda.addEnvironment("STAGE", config2.stage, { removeInEdge: true });
  lambda.addEnvironment("STACK", stackConfig.name, { removeInEdge: true });
  return lambda;
};

// src/app.ts
var import_deepmerge = __toESM(require("deepmerge"), 1);
var makeApp = (config2) => {
  return new import_aws_cdk_lib5.App({
    outdir: assemblyDir,
    defaultStackSynthesizer: new import_aws_cdk_lib5.DefaultStackSynthesizer({
      fileAssetsBucketName: assetBucketName(config2),
      fileAssetPublishingRoleArn: "",
      generateBootstrapVersionRule: false
    })
  });
};
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
var toApp = async (appConfig, filters) => {
  const assets = new Assets();
  const app = makeApp(appConfig);
  const stacks = [];
  const plugins = [
    functionPlugin,
    // cronPlugin,
    // queuePlugin,
    ...appConfig.plugins || []
  ];
  debug("Plugins detected:", plugins.map((plugin) => style.info(plugin.name)).join(", "));
  debug("Run plugin validation schema");
  let config2 = appConfig;
  for (const plugin of plugins) {
    if (plugin.schema) {
      const partialConfig = await plugin.schema.parseAsync(config2);
      config2 = (0, import_deepmerge.default)(config2, partialConfig);
    }
  }
  debug("Merged config", config2);
  debug("Run plugin onApp listeners");
  plugins.forEach((plugin) => plugin.onApp?.({ config: config2, app, assets }));
  debug("Stack filters:", filters.map((filter) => style.info(filter)).join(", "));
  const filterdStacks = filters.length === 0 ? config2.stacks : getAllDepends(
    // config.stacks,
    config2.stacks.filter((stack) => filters.includes(stack.name))
  );
  debug("Found stacks:", filterdStacks);
  for (const stackConfig of filterdStacks) {
    const { stack } = toStack({
      config: config2,
      stackConfig,
      assets,
      plugins,
      app
    });
    stacks.push({ stack, config: stackConfig });
  }
  const dependencyTree = [{
    stack: globalStack(config2, app),
    level: 0,
    children: createDependencyTree(stacks)
  }];
  return {
    app,
    assets,
    // stacks: stacks.map(({ stack }) => stack),
    plugins,
    stackNames: filterdStacks.map((stack) => stack.name),
    dependencyTree
    // deploymentTree: createDeploymentTree(stacks)
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
    this.subs.forEach((sub) => sub(value));
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
var dialog = (type, lines) => {
  const padding = 3;
  const icon = style[type](symbol[type].padEnd(padding));
  return lines.map((line, i) => {
    if (i === 0) {
      return icon + line;
    } else {
      return " ".repeat(padding) + line;
    }
  }).join(br()) + br();
};
var loadingDialog = (message) => {
  const [icon, stop] = createSpinner();
  const description = new Signal(message);
  const time = new Signal("");
  const start = /* @__PURE__ */ new Date();
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
      const end = /* @__PURE__ */ new Date();
      const diff = end.getTime() - start.getTime();
      description.set(message2);
      time.set(style.time(diff) + style.time.dim("ms"));
      stop();
      icon.set(style.success(symbol.success));
    };
  };
};

// src/cli/ui/layout/logs.ts
var previous = /* @__PURE__ */ new Date();
var logs = () => {
  if (!process.env.VERBOSE) {
    return [];
  }
  const logs2 = flushDebug();
  return [
    hr(),
    br(),
    " ".repeat(3),
    style.label("Debug Logs:"),
    br(),
    br(),
    logs2.map((log) => {
      const diff = log.date.getTime() - previous.getTime();
      const time = `+${diff}`.padStart(7);
      previous = log.date;
      return [
        style.time(`${time}${style.time.dim("ms")}`),
        " [ ",
        log.type,
        " ] ",
        log.message,
        br(),
        log.type === "error" ? br() : ""
      ];
    }),
    br(),
    hr()
  ];
};

// src/cli/ui/layout/footer.ts
var footer = () => {
  return [
    br(),
    logs()
  ];
};

// src/config.ts
var import_path3 = require("path");

// src/util/account.ts
var import_client_sts = require("@aws-sdk/client-sts");
var getAccountId = async (credentials, region) => {
  const client = new import_client_sts.STSClient({ credentials, region });
  const result = await client.send(new import_client_sts.GetCallerIdentityCommand({}));
  return result.Account;
};

// src/util/credentials.ts
var import_credential_providers = require("@aws-sdk/credential-providers");
var getCredentials = (profile) => {
  return (0, import_credential_providers.fromIni)({
    profile
  });
};

// src/config.ts
var import_ts_import = require("ts-import");
var importConfig = async (options) => {
  debug("Import config file");
  const fileName = (0, import_path3.join)(process.cwd(), options.configFile || "awsless.config.ts");
  const module2 = await (0, import_ts_import.load)(fileName);
  const appConfig = typeof module2.default === "function" ? await module2.default({
    profile: options.profile,
    region: options.region,
    stage: options.stage
  }) : module2.default;
  debug("Load credentials", style.info(appConfig.profile));
  const credentials = getCredentials(appConfig.profile);
  debug("Load AWS account ID");
  const account = await getAccountId(credentials, appConfig.region);
  debug("Account ID:", style.info(account));
  return {
    ...appConfig,
    stage: appConfig.stage ?? "prod",
    account,
    credentials
  };
};

// src/cli/ui/layout/list.ts
var list = (data) => {
  const padding = 3;
  const gap = 1;
  const size = Object.keys(data).reduce((total, name) => {
    return name.length > total ? name.length : total;
  }, 0);
  return Object.entries(data).map(([name, value]) => [
    " ".repeat(padding),
    style.label((name + ":").padEnd(size + gap + 1)),
    value,
    br()
  ]);
};

// src/cli/ui/layout/logo.ts
var logo = () => {
  return [
    style.warning("\u26A1\uFE0F "),
    style.primary("AWS"),
    style.primary.dim("LESS"),
    br()
  ];
};

// src/cli/ui/layout/header.ts
var header = (config2) => {
  return [
    logo(),
    br(),
    list({
      App: config2.name,
      Stage: config2.stage,
      Region: config2.region,
      Profile: config2.profile
    }),
    br()
  ];
};

// src/cli/lib/interface.ts
var import_readline = require("readline");
var import_child_process = require("child_process");
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
    this.readline = (0, import_readline.createInterface)({ input: this.input, escapeCodeTimeout: 50 });
    (0, import_readline.emitKeypressEvents)(this.input, this.readline);
    this.hideCursor();
    if (this.input.isTTY) {
      this.input.setRawMode(true);
    }
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
      } else if (action === "abort") {
        this.showCursor();
        process.exit(1);
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
      (0, import_child_process.exec)("afplay /System/Library/Sounds/Tink.aiff");
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
  update() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.flush();
    }, 0);
  }
  flush() {
    clearTimeout(this.timeout);
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
    const oldSize = this.screen.length;
    const newSize = screen.length;
    const size = Math.max(oldSize, newSize);
    const height = this.height();
    const start = Math.max(oldSize - height, 0);
    for (let y = start; y < size; y++) {
      const line = screen[y];
      if (line !== this.screen[y]) {
        if (y > oldSize) {
          const x = (this.screen[y - 1]?.length || 0) - 1;
          this.output.cursorTo?.(x, y - 1);
          this.output.write?.("\n" + line);
        } else {
          this.output.cursorTo?.(0, y);
          this.output.write?.(line);
        }
        this.output.clearLine?.(1);
      }
    }
    this.screen = screen;
  }
  clear() {
    let count = this.output.rows;
    while (count--) {
      this.output.write("\n");
    }
    this.output.cursorTo?.(0, 0);
    this.output.clearScreenDown?.();
  }
};

// src/cli/lib/terminal.ts
var createTerminal = (input = process.stdin, output = process.stdout) => {
  const ins = new Interface(input);
  const outs = new Renderer(output, ins);
  return { in: ins, out: outs };
};

// src/cli/ui/layout/layout.ts
var layout = async (cb) => {
  const term = createTerminal();
  term.out.clear();
  try {
    const options = program.optsWithGlobals();
    const config2 = await importConfig(options);
    term.out.write(header(config2));
    await cb(config2, term.out.write.bind(term.out), term);
  } catch (error) {
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
    term.out.write(footer());
    term.in.unref();
    setTimeout(() => {
      process.exit(0);
    }, 50);
  }
};

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

// src/cli/command/build.ts
var build = (program2) => {
  program2.command("build").argument("[stack...]", "Optionally filter stacks to build").description("Build your app").action(async (filters) => {
    await layout(async (config2, write, term) => {
      const { app, assets } = toApp(config2, filters);
      const done = write(loadingDialog("Building stack assets..."));
      const groups = new Signal([]);
      write(groups);
      await Promise.all(assets.map(async (stack, assets2) => {
        const group = new Signal([
          br(),
          // symbol.pointerSmall,
          "   ",
          style.label(stack.name),
          br()
        ]);
        groups.update((groups2) => [...groups2, group]);
        await Promise.all(assets2.map(async (asset) => {
          const [icon, stop] = createSpinner();
          const start = /* @__PURE__ */ new Date();
          const time = new Signal("");
          const details = new Signal("");
          const status2 = new Signal("building");
          const line = flexLine(term, [
            icon,
            "  ",
            style.warning(asset.resource),
            " ",
            style.placeholder(symbol.pointerSmall),
            " ",
            style.info(asset.resourceName),
            " "
          ], [
            // hr,
            " [ ",
            status2,
            " ]",
            details,
            time,
            br()
          ]);
          group.update((group2) => [...group2, line]);
          const data = await asset.build?.();
          const diff = (/* @__PURE__ */ new Date()).getTime() - start.getTime();
          time.set(" " + style.time(diff) + style.time.dim("ms"));
          if (data) {
            details.set(" " + Object.entries(data).map(([key, value]) => {
              return `[ ${style.label(key)}: ${style.info(value)} ]`;
            }).join(" "));
          }
          status2.set(style.success("done"));
          icon.set(style.success(symbol.success));
          stop();
        }));
      }));
      done("Done building stack assets");
    });
  });
};

// src/stack/client.ts
var import_client_cloudformation = require("@aws-sdk/client-cloudformation");
var import_client_s3 = require("@aws-sdk/client-s3");
var StackClient = class {
  // 30 seconds
  constructor(config2) {
    this.config = config2;
    this.client = new import_client_cloudformation.CloudFormationClient({
      credentials: config2.credentials,
      region: config2.region
    });
  }
  client;
  maxWaitTime = 60 * 30;
  // 30 minutes
  maxDelay = 30;
  shouldUploadTemplate(stack) {
    const body = JSON.stringify(stack.template);
    const size = Buffer.byteLength(body, "utf8");
    return size > 5e4;
  }
  templateProp(stack) {
    return this.shouldUploadTemplate(stack) ? {
      TemplateUrl: assetBucketUrl(this.config, stack.stackName)
    } : {
      TemplateBody: JSON.stringify(stack.template)
    };
  }
  async upload(stack) {
    debug("Upload the", style.info(stack.id), "stack to awsless assets bucket");
    const client = new import_client_s3.S3Client({
      credentials: this.config.credentials,
      region: this.config.region
    });
    await client.send(new import_client_s3.PutObjectCommand({
      Bucket: assetBucketName(this.config),
      Key: `${stack.stackName}/cloudformation.json`,
      Body: JSON.stringify(stack.template),
      ACL: import_client_s3.ObjectCannedACL.private,
      StorageClass: import_client_s3.StorageClass.STANDARD_IA
    }));
  }
  async create(stack, capabilities) {
    debug("Create the", style.info(stack.id), "stack");
    await this.client.send(new import_client_cloudformation.CreateStackCommand({
      StackName: stack.stackName,
      EnableTerminationProtection: false,
      OnFailure: import_client_cloudformation.OnFailure.DELETE,
      Capabilities: capabilities,
      ...this.templateProp(stack)
    }));
    await (0, import_client_cloudformation.waitUntilStackCreateComplete)({
      client: this.client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: stack.stackName
    });
  }
  async update(stack, capabilities) {
    debug("Update the", style.info(stack.id), "stack");
    await this.client.send(new import_client_cloudformation.UpdateStackCommand({
      StackName: stack.stackName,
      Capabilities: capabilities,
      ...this.templateProp(stack)
    }));
    await (0, import_client_cloudformation.waitUntilStackUpdateComplete)({
      client: this.client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: stack.stackName
    });
  }
  async validate(stack) {
    debug("Validate the", style.info(stack.id), "stack");
    const result = await this.client.send(new import_client_cloudformation.ValidateTemplateCommand({
      ...this.templateProp(stack)
    }));
    return result.Capabilities;
  }
  async get(name) {
    debug("Get stack info for:", style.info(name));
    let result;
    try {
      result = await this.client.send(new import_client_cloudformation.DescribeStacksCommand({
        StackName: name
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "ValidationError" && error.message.includes("does not exist")) {
        return;
      }
      throw error;
    }
    const stack = result.Stacks?.[0];
    if (!stack) {
      debug("Stack not found");
      return;
    }
    const resultTemplate = await this.client.send(new import_client_cloudformation.GetTemplateCommand({
      StackName: name,
      TemplateStage: import_client_cloudformation.TemplateStage.Original
    }));
    const outputs = {};
    stack.Outputs?.forEach((output) => {
      outputs[output.OutputKey] = output.OutputValue;
    });
    debug("Status for: ", style.info(name), "is", stack.StackStatus);
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
    const data = await this.get(stack.stackName);
    debug("Deploy:", style.info(stack.stackName));
    if (data?.template === JSON.stringify(stack.template)) {
      debug("No stack changes");
      return false;
    }
    if (this.shouldUploadTemplate(stack)) {
      await this.upload(stack);
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
  async delete(name) {
    const data = await this.get(name);
    debug("Delete the", style.info(name), "stack");
    if (!data) {
      debug("Already deleted");
      return;
    }
    await this.client.send(new import_client_cloudformation.DeleteStackCommand({
      StackName: name
    }));
    await (0, import_client_cloudformation.waitUntilStackDeleteComplete)({
      client: this.client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: name
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
var bootstrapDeployer = (config2) => {
  return async (term) => {
    debug("Initializing bootstrap");
    const app = makeApp(config2);
    const client = new StackClient(config2);
    const bootstrap2 = bootstrapStack(config2, app);
    const shouldDeploy = await shouldDeployBootstrap(client, bootstrap2.stackName);
    if (shouldDeploy) {
      term.out.write(dialog("warning", [`Your app hasn't been bootstrapped yet`]));
      const confirmed = await term.out.write(confirmPrompt("Would you like to bootstrap?"));
      if (!confirmed) {
        throw new Cancelled();
      }
      const done = term.out.write(loadingDialog("Bootstrapping..."));
      const assembly = app.synth();
      await client.deploy(assembly.stacks[0]);
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
    await layout(async (config2, write) => {
      await write(bootstrapDeployer(config2));
    });
  });
};

// src/cli/ui/complex/stack-tree.ts
var stripEscapeCode2 = (str) => {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
};
var getLine = (windowWidth, name, status2, deep) => {
  const usedWidth = stripEscapeCode2(name).length + stripEscapeCode2(status2).length + deep * 3 + 9;
  return style.placeholder("\u2500".repeat(windowWidth - usedWidth));
};
var stackTree = (nodes, statuses) => {
  return (term) => {
    const render = (nodes2, deep = 0, parents = []) => {
      const size = nodes2.length - 1;
      nodes2.forEach((node, i) => {
        const id = node.stack.artifactId;
        const status2 = statuses[id];
        const first = i === 0 && deep === 0;
        const last = i === size;
        const more = i < size;
        parents.forEach((parent) => {
          term.out.write(style.label(
            parent ? "\u2502".padEnd(3) : " ".repeat(3)
          ));
        });
        const hr2 = derive([status2], (status3) => {
          return getLine(term.out.width(), id, status3, deep);
        });
        term.out.write(style.label(
          first && size === 0 ? "  " : first ? "\u250C\u2500" : last ? "\u2514\u2500" : "\u251C\u2500"
        ));
        term.out.write([
          " ",
          style.info(id),
          " ",
          hr2,
          style.placeholder(" [ "),
          status2,
          style.placeholder(" ] "),
          br()
        ]);
        render(node.children, deep + 1, [...parents, more]);
      });
    };
    render(nodes);
  };
};

// src/cli/command/status.ts
var status = (program2) => {
  program2.command("status").argument("[stacks...]", "Optionally filter stacks to lookup status").description("View the application status").action(async (filters) => {
    await layout(async (config2, write) => {
      const { app, assets, dependencyTree } = await toApp(config2, filters);
      const doneBuilding = write(loadingDialog("Building stack assets..."));
      const assembly = app.synth();
      doneBuilding("Done building stack assets");
      const doneLoading = write(loadingDialog("Loading stack information..."));
      const client = new StackClient(config2);
      const statuses = [];
      const stackStatuses = {};
      assembly.stacks.forEach((stack) => {
        stackStatuses[stack.id] = new Signal(style.info("Loading..."));
      });
      write(br());
      write(stackTree(dependencyTree, stackStatuses));
      write(br());
      debug("Load metadata for all deployed stacks on AWS");
      await Promise.all(assembly.stacks.map(async (stack, i) => {
        const info = await client.get(stack.stackName);
        const name = stack.id;
        const signal = stackStatuses[name];
        await new Promise((resolve) => setTimeout(resolve, i * 1e3));
        if (!info) {
          signal.set(style.error("non-existent"));
          statuses.push("non-existent");
        } else if (info.template !== JSON.stringify(stack.template)) {
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

// src/cli/command/deploy.ts
var deploy = (program2) => {
  program2.command("deploy").argument("[stacks...]", "Optionally filter stacks to deploy").description("Deploy your app to AWS").action(async (filters) => {
    await layout(async (config2, write) => {
      await write(bootstrapDeployer(config2));
      const { app, stackNames, assets, dependencyTree } = toApp(config2, filters);
      const formattedFilter = stackNames.map((i) => style.info(i)).join(style.placeholder(", "));
      debug("Stacks to deploy", formattedFilter);
      const deployAll = filters.length === 0;
      const deploySingle = filters.length === 1;
      const confirm = await write(confirmPrompt(deployAll ? `Are you sure you want to deploy ${style.warning("all")} stacks?` : deploySingle ? `Are you sure you want to deploy the ${formattedFilter} stack?` : `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`));
      if (!confirm) {
        throw new Cancelled();
      }
      const doneBuilding = write(loadingDialog("Building stack assets..."));
      await Promise.all(assets.map(async (_, assets2) => {
        await Promise.all(assets2.map(async (asset) => {
          await asset.build?.();
        }));
      }));
      doneBuilding("Done building stack assets");
      const donePublishing = write(loadingDialog("Publishing stack assets to AWS..."));
      await Promise.all(assets.map(async (_, assets2) => {
        await Promise.all(assets2.map(async (asset) => {
          await asset.publish?.();
        }));
      }));
      donePublishing("Done publishing stack assets to AWS");
      const assembly = app.synth();
      const statuses = {};
      assembly.stacks.map((stack) => {
        statuses[stack.id] = new Signal(style.info("waiting"));
      });
      const doneDeploying = write(loadingDialog("Deploying stacks to AWS..."));
      write(br());
      write(stackTree(dependencyTree, statuses));
      const client = new StackClient(config2);
      const deploymentLine = createDeploymentLine(dependencyTree);
      for (const stacks of deploymentLine) {
        await Promise.allSettled(stacks.map(async (stack) => {
          const stackArtifect = assembly.stacks.find((item) => item.id === stack.artifactId);
          statuses[stack.artifactId].set(style.warning("deploying"));
          try {
            await client.deploy(stackArtifect);
          } catch (error) {
            debugError(error);
            statuses[stack.artifactId].set(style.error("failed"));
            throw error;
          }
          statuses[stack.artifactId].set(style.success("deployed"));
        }));
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

// src/cli/ui/prompt/password.ts
var passwordPrompt = (label, options = {}) => {
  return textPrompt(label, {
    ...options,
    renderer(value) {
      return value.map(() => "*");
    }
  });
};

// src/cli/command/config/set.ts
var set = (program2) => {
  program2.command("set <name>").description("Set a config value").action(async (name) => {
    await layout(async (config2, write) => {
      const params = new Params(config2);
      write(list({
        "Set config parameter": style.info(name)
      }));
      write(br());
      const value = await write(passwordPrompt("Enter config value"));
      if (value === "") {
        write(dialog("error", [`Provided config value can't be empty`]));
      } else {
        const done = write(loadingDialog(`Saving remote config parameter`));
        await params.set(name, value);
        done(`Done saving remote config parameter`);
      }
    });
  });
};

// src/cli/command/config/get.ts
var get = (program2) => {
  program2.command("get <name>").description("Get a config value").action(async (name) => {
    await layout(async (config2, write) => {
      const params = new Params(config2);
      const done = write(loadingDialog(`Getting remote config parameter`));
      const value = await params.get(name);
      done(`Done getting remote config parameter`);
      write(br());
      write(list({
        Name: name,
        Value: value || style.error("(empty)")
      }));
    });
  });
};

// src/cli/command/config/delete.ts
var del = (program2) => {
  program2.command("delete <name>").description("Delete a config value").action(async (name) => {
    await layout(async (config2, write) => {
      const params = new Params(config2);
      write(dialog("warning", [`Your deleting the ${style.info(name)} config parameter`]));
      const confirm = await write(confirmPrompt("Are you sure?"));
      if (!confirm) {
        throw new Cancelled();
      }
      const done = write(loadingDialog(`Deleting remote config parameter`));
      const value = await params.get(name);
      await params.delete(name);
      done(`Done deleting remote config parameter`);
      write(br());
      write(list({
        Name: name,
        Value: value || style.error("(empty)")
      }));
    });
  });
};

// src/cli/command/config/list.ts
var list2 = (program2) => {
  program2.command("list").description(`List all config value's`).action(async () => {
    await layout(async (config2, write) => {
      const params = new Params(config2);
      const done = write(loadingDialog("Loading config parameters..."));
      const values = await params.list();
      done("Done loading config values");
      if (Object.keys(values).length > 0) {
        write(br());
        write(list(values));
      } else {
        write(dialog("warning", ["No config parameters found"]));
      }
    });
  });
};

// src/cli/command/config/index.ts
var commands = [
  set,
  get,
  del,
  list2
];
var config = (program2) => {
  const command = program2.command("config").description("Manage config values");
  commands.forEach((cb) => cb(command));
};

// src/cli/program.ts
var program = new import_commander.Command();
program.name("awsless");
program.option("--config-file <string>", "The config file location");
program.option("--stage <string>", "The stage to use, defaults to prod stage", "prod");
program.option("--profile <string>", "The AWS profile to use");
program.option("--region <string>", "The AWS region to use");
program.option("-m --mute", "Mute sound effects");
program.option("-v --verbose", "Print verbose logs");
program.on("option:verbose", () => {
  process.env.VERBOSE = program.opts().verbose ? "1" : void 0;
});
var commands2 = [
  bootstrap,
  status,
  build,
  deploy,
  // diff,
  // remove,
  config
];
commands2.forEach((command) => command(program));

// src/bin.ts
program.parse(process.argv);
