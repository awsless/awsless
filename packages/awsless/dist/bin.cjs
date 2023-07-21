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
var import_aws_cdk_lib6 = require("aws-cdk-lib");

// src/stack.ts
var import_aws_cdk_lib = require("aws-cdk-lib");
var import_aws_iam = require("aws-cdk-lib/aws-iam");

// src/cli/style.ts
var import_chalk = __toESM(require("chalk"), 1);
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
  attr: import_chalk.default.yellow,
  cursor: import_chalk.default.bgWhite.blackBright
};

// src/cli/logger.ts
var queue = [];
var debugError = (error) => {
  queue.push({
    date: /* @__PURE__ */ new Date(),
    type: style.error.dim("error"),
    // color: 'red',
    // type: 'error',
    message: typeof error === "string" ? error : error instanceof Error ? style.error(error.message || "") : JSON.stringify(error)
  });
};
var debug = (...parts) => {
  queue.push({
    date: /* @__PURE__ */ new Date(),
    type: style.warning.dim("debug"),
    // color: 'yellow',
    // type: 'debug',
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
  debug("Run plugin onStack listeners");
  const functions = plugins.map((plugin) => plugin.onStack?.({
    config: config2,
    assets,
    app,
    stack,
    stackConfig,
    bind
  })).filter(Boolean).flat().filter(Boolean);
  if (stack.node.children.length === 0) {
    throw new Error(`Stack ${style.info(stackConfig.name)} has no resources defined`);
  }
  bindings.forEach((cb) => functions.forEach(cb));
  const allowConfigParameters = new import_aws_iam.PolicyStatement({
    actions: [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ],
    resources: [
      import_aws_cdk_lib.Arn.format({
        service: "ssm",
        resource: "parameter",
        resourceName: configParameterPrefix(config2)
      })
      // Fn.sub('arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter' + configParameterPrefix(config)),
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

// src/stack/app-bootstrap.ts
var import_aws_cdk_lib5 = require("aws-cdk-lib");

// src/plugin.ts
var definePlugin = (plugin) => plugin;

// src/plugins/cron/index.ts
var import_zod10 = require("zod");

// src/plugins/cron/schema/schedule.ts
var import_aws_events = require("aws-cdk-lib/aws-events");
var import_zod = require("zod");
var import_aws_cron_expression_validator = require("aws-cron-expression-validator");
var RateExpressionSchema = import_zod.z.custom((value) => {
  return import_zod.z.string().regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/).refine((rate) => {
    const [str] = rate.substring(5).split(" ");
    const number = parseInt(str);
    return number > 0;
  }).safeParse(value).success;
}, "Invalid rate expression").transform(import_aws_events.Schedule.expression);
var CronExpressionSchema = import_zod.z.custom((value) => {
  return import_zod.z.string().startsWith("cron(").endsWith(")").safeParse(value).success;
}, "Invalid cron expression").superRefine((value, ctx) => {
  const cron = value.substring(5, value.length - 1);
  try {
    (0, import_aws_cron_expression_validator.awsCronExpressionValidator)(cron);
  } catch (error) {
    if (error instanceof Error) {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: error.message
      });
    } else {
      ctx.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "Invalid cron expression"
      });
    }
  }
}).transform(import_aws_events.Schedule.expression);
var ScheduleExpressionSchema = RateExpressionSchema.or(CronExpressionSchema);

// src/plugins/cron/index.ts
var import_aws_events2 = require("aws-cdk-lib/aws-events");

// src/util/resource.ts
var import_change_case = require("change-case");
var toId = (resource, id) => {
  return (0, import_change_case.pascalCase)(`${resource}-${id}`);
};
var toName = (stack, id) => {
  return (0, import_change_case.paramCase)(`${stack.stackName}-${id}`);
};
var toEnvKey = (resource, id) => {
  return (0, import_change_case.constantCase)(`RESOURCE_${resource}_${id}`);
};
var addResourceEnvironment = (stack, resource, id, lambda) => {
  const key = toEnvKey(resource, id);
  const value = toName(stack, id);
  lambda.addEnvironment(key, value, {
    removeInEdge: true
  });
};

// src/plugins/function/index.ts
var import_zod9 = require("zod");

// src/schema/duration.ts
var import_zod2 = require("zod");
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
var DurationSchema = import_zod2.z.custom((value) => {
  return import_zod2.z.string().regex(/[0-9]+ (seconds?|minutes?|hours?|days?)/).safeParse(value).success;
}, "Invalid duration").transform(toDuration);

// src/schema/local-file.ts
var import_promises = require("fs/promises");
var import_zod3 = require("zod");
var LocalFileSchema = import_zod3.z.string().refine(async (path) => {
  try {
    await (0, import_promises.access)(path, import_promises.constants.R_OK);
  } catch (error) {
    return false;
  }
  return true;
}, `File doesn't exist`);

// src/plugins/function/index.ts
var import_aws_lambda3 = require("aws-cdk-lib/aws-lambda");

// src/plugins/function/schema/runtime.ts
var import_aws_lambda = require("aws-cdk-lib/aws-lambda");
var import_zod4 = require("zod");
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
var RuntimeSchema = import_zod4.z.enum(Object.keys(runtimes)).transform(toRuntime);

// src/plugins/function/schema/architecture.ts
var import_aws_lambda2 = require("aws-cdk-lib/aws-lambda");
var import_zod5 = require("zod");
var toArchitecture = (architecture) => {
  return architecture === "x86_64" ? import_aws_lambda2.Architecture.X86_64 : import_aws_lambda2.Architecture.ARM_64;
};
var ArchitectureSchema = import_zod5.z.enum(["x86_64", "arm_64"]).transform(toArchitecture);

// src/schema/resource-id.ts
var import_zod6 = require("zod");
var ResourceIdSchema = import_zod6.z.string().min(3).max(24).regex(/[a-z\-]+/, "Invalid resource ID");

// src/schema/size.ts
var import_core2 = require("aws-cdk-lib/core");
var import_zod7 = require("zod");
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
var SizeSchema = import_zod7.z.custom((value) => {
  return import_zod7.z.string().regex(/[0-9]+ (KB|MB|GB)/).safeParse(value).success;
}, "Invalid size").transform(toSize);

// src/plugins/function/util/build-worker.ts
var import_worker_threads = require("worker_threads");
var cjs = typeof require !== "undefined";
var importESM = `
import { bundle } from "@awsless/code";
import { createHash } from "crypto";
import { parentPort, workerData } from "worker_threads";
`;
var importCJS = `
const { bundle } = require("@awsless/code");
const { createHash } = require("crypto");
const { parentPort, workerData } = require("worker_threads");
`;
var workerCode = `
${cjs ? importCJS : importESM}

const build = async (file) => {
	const { code, map } = await bundle(file, {
		format: 'esm',
		sourceMap: true,
		minimize: true,
		onwarn: () => {},
		moduleSideEffects: (id) => file === id,
		external: (importee) => (
			importee.startsWith('aws-sdk') ||
			importee.startsWith('@aws-sdk')
		),
	})

	const hash = createHash('sha1').update(code).digest('hex')

    parentPort.postMessage(JSON.stringify({
		handler: 'index.default',
		hash,
		files: [
			{ name: 'index.js', code, map: map?.toString() }
		]
	}))
}

build(workerData)
`;
var defaultBuild = async (file) => {
  return new Promise((resolve, reject) => {
    const worker = new import_worker_threads.Worker(workerCode, { workerData: file, eval: true });
    const cleanUp2 = () => {
      worker.removeAllListeners();
      worker.terminate();
    };
    worker.on("message", (data) => {
      resolve(JSON.parse(data.toString("utf8")));
      cleanUp2();
    });
    worker.on("error", (data) => {
      reject(data);
      cleanUp2();
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
        cleanUp2();
      }
    });
  });
};

// src/plugins/function/util/build.ts
var import_jszip = __toESM(require("jszip"), 1);
var import_path3 = require("path");
var import_promises2 = require("fs/promises");
var import_filesize = require("filesize");
var zipFiles = (files) => {
  const zip = new import_jszip.default();
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
var writeBuildHash = async (config2, stack, id, hash) => {
  const funcPath = (0, import_path3.join)(functionDir, config2.name, stack.artifactId, id);
  const versionFile = (0, import_path3.join)(funcPath, "HASH");
  await (0, import_promises2.writeFile)(versionFile, hash);
};
var writeBuildFiles = async (config2, stack, id, files) => {
  const bundle = await zipFiles(files);
  const funcPath = (0, import_path3.join)(functionDir, config2.name, stack.artifactId, id);
  const filesPath = (0, import_path3.join)(funcPath, "files");
  const bundleFile = (0, import_path3.join)(funcPath, "bundle.zip");
  debug("Bundle size of", style.info((0, import_path3.join)(config2.name, stack.artifactId, id)), "is", style.attr((0, import_filesize.filesize)(bundle.byteLength)));
  await (0, import_promises2.mkdir)(filesPath, { recursive: true });
  await (0, import_promises2.writeFile)(bundleFile, bundle);
  await Promise.all(files.map(async (file) => {
    const fileName = (0, import_path3.join)(filesPath, file.name);
    await (0, import_promises2.mkdir)((0, import_path3.basename)(fileName), { recursive: true });
    await (0, import_promises2.writeFile)(fileName, file.code);
    if (file.map) {
      const mapName = (0, import_path3.join)(filesPath, `${file.name}.map`);
      await (0, import_promises2.writeFile)(mapName, file.map);
    }
  }));
  return {
    file: bundleFile,
    size: bundle.byteLength
  };
};

// src/plugins/function/util/publish.ts
var import_path5 = require("path");
var import_promises3 = require("fs/promises");
var import_client_s3 = require("@aws-sdk/client-s3");

// src/stack/bootstrap.ts
var import_aws_cdk_lib2 = require("aws-cdk-lib");
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
  const stack = new import_aws_cdk_lib2.Stack(app, "bootstrap", {
    stackName: `awsless-bootstrap`
  });
  new import_aws_s3.Bucket(stack, "assets", {
    bucketName: assetBucketName(config2),
    versioned: true,
    accessControl: import_aws_s3.BucketAccessControl.PRIVATE,
    removalPolicy: import_aws_cdk_lib2.RemovalPolicy.DESTROY
  });
  new import_aws_cdk_lib2.CfnOutput(stack, "version", {
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

// src/plugins/function/util/publish.ts
var publishFunctionAsset = async (config2, stack, id) => {
  const bucket = assetBucketName(config2);
  const key = `${config2.name}/${stack.artifactId}/function/${id}.zip`;
  const funcPath = (0, import_path5.join)(functionDir, config2.name, stack.artifactId, id);
  const bundleFile = (0, import_path5.join)(funcPath, "bundle.zip");
  const hashFile = (0, import_path5.join)(funcPath, "HASH");
  const hash = await (0, import_promises3.readFile)(hashFile, "utf8");
  const file = await (0, import_promises3.readFile)(bundleFile);
  const client = new import_client_s3.S3Client({
    credentials: config2.credentials,
    region: config2.region
  });
  let getResult;
  try {
    getResult = await client.send(new import_client_s3.GetObjectCommand({
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
    return getResult.VersionId;
  }
  const putResult = await client.send(new import_client_s3.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ACL: import_client_s3.ObjectCannedACL.private,
    StorageClass: import_client_s3.StorageClass.STANDARD,
    Metadata: {
      hash
    }
  }));
  return putResult.VersionId;
};

// src/plugins/function/schema/retry-attempts.ts
var import_zod8 = require("zod");
var RetryAttempts = import_zod8.z.number().int().min(0).max(2);

// src/util/byte-size.ts
var import_filesize2 = require("filesize");
var formatByteSize = (size) => {
  const [number, unit] = (0, import_filesize2.filesize)(size).toString().split(" ");
  return style.attr(number) + style.attr.dim(unit);
};

// src/plugins/function/index.ts
var FunctionSchema = import_zod9.z.union([
  LocalFileSchema,
  import_zod9.z.object({
    file: LocalFileSchema,
    timeout: DurationSchema.optional(),
    runtime: RuntimeSchema.optional(),
    memorySize: SizeSchema.optional(),
    architecture: ArchitectureSchema.optional(),
    ephemeralStorageSize: SizeSchema.optional(),
    retryAttempts: RetryAttempts,
    environment: import_zod9.z.record(import_zod9.z.string(), import_zod9.z.string()).optional()
  })
]);
var schema = import_zod9.z.object({
  defaults: import_zod9.z.object({
    function: import_zod9.z.object({
      timeout: DurationSchema.default("10 seconds"),
      runtime: RuntimeSchema.default("nodejs18.x"),
      memorySize: SizeSchema.default("128 MB"),
      architecture: ArchitectureSchema.default("arm_64"),
      ephemeralStorageSize: SizeSchema.default("512 MB"),
      retryAttempts: RetryAttempts.default(2),
      environment: import_zod9.z.record(import_zod9.z.string(), import_zod9.z.string()).optional()
    }).default({})
  }).default({}),
  stacks: import_zod9.z.object({
    functions: import_zod9.z.record(
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
var toFunction = ({ config: config2, stack, stackConfig, assets }, id, fileOrProps) => {
  const props = typeof fileOrProps === "string" ? { ...config2.defaults?.function, file: fileOrProps } : { ...config2.defaults?.function, ...fileOrProps };
  const lambda = new import_aws_lambda3.Function(stack, toId("function", id), {
    functionName: toName(stack, id),
    handler: "index.default",
    code: import_aws_lambda3.Code.fromInline("export default () => {}"),
    ...props,
    memorySize: props.memorySize.toMebibytes()
  });
  lambda.addEnvironment("APP", config2.name, { removeInEdge: true });
  lambda.addEnvironment("STAGE", config2.stage, { removeInEdge: true });
  lambda.addEnvironment("STACK", stackConfig.name, { removeInEdge: true });
  if (lambda.runtime.toString().startsWith("nodejs")) {
    lambda.addEnvironment("AWS_NODEJS_CONNECTION_REUSE_ENABLED", "1", {
      removeInEdge: true
    });
  }
  assets.add({
    stack: stackConfig,
    resource: "function",
    resourceName: id,
    async build() {
      const result = await defaultBuild(props.file);
      const bundle = await writeBuildFiles(config2, stack, id, result.files);
      await writeBuildHash(config2, stack, id, result.hash);
      const func = lambda.node.defaultChild;
      func.handler = result.handler;
      return {
        size: formatByteSize(bundle.size)
      };
    },
    async publish() {
      const version2 = await publishFunctionAsset(config2, stack, id);
      const func = lambda.node.defaultChild;
      func.code = {
        s3Bucket: assetBucketName(config2),
        s3Key: `${config2.name}/${stack.artifactId}/function/${id}.zip`,
        s3ObjectVersion: version2
      };
    }
  });
  return lambda;
};

// src/plugins/cron/index.ts
var import_aws_events_targets = require("aws-cdk-lib/aws-events-targets");
var cronPlugin = definePlugin({
  name: "cron",
  schema: import_zod10.z.object({
    stacks: import_zod10.z.object({
      crons: import_zod10.z.record(ResourceIdSchema, import_zod10.z.object({
        consumer: FunctionSchema,
        schedule: ScheduleExpressionSchema,
        description: import_zod10.z.string().max(512).optional()
      })).optional()
    }).array()
  }),
  onStack(context) {
    return Object.entries(context.stackConfig.crons || {}).map(([id, props]) => {
      const lambda = toFunction(context, id, props.consumer);
      const target = new import_aws_events_targets.LambdaFunction(lambda);
      new import_aws_events2.Rule(context.stack, toId("cron", id), {
        ruleName: toName(context.stack, id),
        schedule: props.schedule,
        description: props.description,
        targets: [target]
      });
      return lambda;
    });
  }
});

// src/plugins/queue.ts
var import_zod11 = require("zod");
var import_aws_sqs = require("aws-cdk-lib/aws-sqs");
var import_aws_lambda_event_sources = require("aws-cdk-lib/aws-lambda-event-sources");
var queuePlugin = definePlugin({
  name: "queue",
  schema: import_zod11.z.object({
    defaults: import_zod11.z.object({
      queue: import_zod11.z.object({
        // fifo: z.boolean().default(false),
        retentionPeriod: DurationSchema.default("7 days"),
        visibilityTimeout: DurationSchema.default("30 seconds"),
        deliveryDelay: DurationSchema.default("0 seconds"),
        receiveMessageWaitTime: DurationSchema.default("0 seconds"),
        maxMessageSize: SizeSchema.default("256 KB")
      }).default({})
    }).default({}),
    stacks: import_zod11.z.object({
      queues: import_zod11.z.record(ResourceIdSchema, import_zod11.z.union([
        LocalFileSchema,
        import_zod11.z.object({
          consumer: FunctionSchema,
          // fifo: z.boolean().optional(),
          retentionPeriod: DurationSchema.optional(),
          visibilityTimeout: DurationSchema.optional(),
          deliveryDelay: DurationSchema.optional(),
          receiveMessageWaitTime: DurationSchema.optional(),
          maxMessageSize: SizeSchema.optional()
        })
      ])).optional()
    }).array()
  }),
  onStack(ctx) {
    const { stack, config: config2, stackConfig, bind } = ctx;
    return Object.entries(stackConfig.queues || {}).map(([id, functionOrProps]) => {
      const props = typeof functionOrProps === "string" ? { ...config2.defaults.queue, consumer: functionOrProps } : { ...config2.defaults.queue, ...functionOrProps };
      const queue2 = new import_aws_sqs.Queue(stack, toId("queue", id), {
        queueName: toName(stack, id),
        ...props,
        maxMessageSizeBytes: props.maxMessageSize.toBytes()
      });
      const lambda = toFunction(ctx, id, props.consumer);
      lambda.addEventSource(new import_aws_lambda_event_sources.SqsEventSource(queue2));
      bind((lambda2) => {
        queue2.grantSendMessages(lambda2);
        addResourceEnvironment(stack, "queue", id, lambda2);
      });
      return lambda;
    });
  }
});

// src/plugins/table/index.ts
var import_zod16 = require("zod");
var import_aws_dynamodb4 = require("aws-cdk-lib/aws-dynamodb");

// src/plugins/table/schema/class-type.ts
var import_aws_dynamodb = require("aws-cdk-lib/aws-dynamodb");
var import_zod12 = require("zod");
var types = {
  "standard": import_aws_dynamodb.TableClass.STANDARD,
  "standard-infrequent-access": import_aws_dynamodb.TableClass.STANDARD_INFREQUENT_ACCESS
};
var TableClassSchema = import_zod12.z.enum(Object.keys(types)).transform((value) => {
  return types[value];
});

// src/plugins/table/schema/attribute.ts
var import_aws_dynamodb2 = require("aws-cdk-lib/aws-dynamodb");
var import_zod13 = require("zod");
var types2 = {
  string: import_aws_dynamodb2.AttributeType.STRING,
  number: import_aws_dynamodb2.AttributeType.NUMBER,
  binary: import_aws_dynamodb2.AttributeType.BINARY
};
var AttributeSchema = import_zod13.z.enum(Object.keys(types2)).transform((value) => types2[value]);

// src/plugins/table/schema/key.ts
var import_zod14 = require("zod");
var KeySchema = import_zod14.z.string().min(1).max(255);

// src/plugins/table/schema/projection-type.ts
var import_aws_dynamodb3 = require("aws-cdk-lib/aws-dynamodb");
var import_zod15 = require("zod");
var types3 = {
  "all": import_aws_dynamodb3.ProjectionType.ALL,
  "keys-only": import_aws_dynamodb3.ProjectionType.KEYS_ONLY
};
var ProjectionTypeSchema = import_zod15.z.union([
  import_zod15.z.enum(Object.keys(types3)).transform((value) => ({
    ProjectionType: types3[value]
  })),
  import_zod15.z.array(KeySchema).min(0).max(20).transform((keys) => ({
    ProjectionType: import_aws_dynamodb3.ProjectionType.INCLUDE,
    NonKeyAttributes: keys
  }))
]);

// src/plugins/table/index.ts
var tablePlugin = definePlugin({
  name: "table",
  schema: import_zod16.z.object({
    stacks: import_zod16.z.object({
      tables: import_zod16.z.record(
        ResourceIdSchema,
        import_zod16.z.object({
          hash: KeySchema,
          sort: KeySchema.optional(),
          fields: import_zod16.z.record(import_zod16.z.string(), AttributeSchema),
          class: TableClassSchema.default("standard"),
          pointInTimeRecovery: import_zod16.z.boolean().default(false),
          timeToLiveAttribute: import_zod16.z.string().optional(),
          indexes: import_zod16.z.record(import_zod16.z.string(), import_zod16.z.object({
            hash: KeySchema,
            sort: KeySchema.optional(),
            projection: ProjectionTypeSchema.default("all")
          })).optional()
        }).refine((props) => {
          return (
            // Check the hash key
            props.fields.hasOwnProperty(props.hash) && // Check the sort key
            (!props.sort || props.fields.hasOwnProperty(props.sort)) && // Check all indexes
            !Object.values(props.indexes || {}).map((index) => (
              // Check the index hash key
              props.fields.hasOwnProperty(index.hash) && // Check the index sort key
              (!index.sort || props.fields.hasOwnProperty(index.sort))
            )).includes(false)
          );
        }, "Hash & Sort keys must be defined inside the table fields")
      ).optional()
    }).array()
  }),
  onStack({ stack, stackConfig, bind }) {
    Object.entries(stackConfig.tables || {}).map(([id, props]) => {
      const buildKey = (attr) => {
        return { name: attr, type: props.fields[attr] };
      };
      const table = new import_aws_dynamodb4.Table(stack, toId("table", id), {
        tableName: toName(stack, id),
        partitionKey: buildKey(props.hash),
        sortKey: props.sort ? buildKey(props.sort) : void 0,
        billingMode: import_aws_dynamodb4.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: props.pointInTimeRecovery,
        timeToLiveAttribute: props.timeToLiveAttribute,
        tableClass: props.class
      });
      Object.entries(props.indexes || {}).forEach(([indexName, entry]) => {
        table.addGlobalSecondaryIndex({
          indexName,
          partitionKey: buildKey(entry.hash),
          sortKey: entry.sort ? buildKey(entry.sort) : void 0,
          ...entry.projection
        });
      });
      bind((lambda) => {
        table.grantReadWriteData(lambda);
        addResourceEnvironment(stack, "table", id, lambda);
      });
    });
  }
});

// src/plugins/store.ts
var import_zod17 = require("zod");
var import_aws_s32 = require("aws-cdk-lib/aws-s3");
var import_aws_cdk_lib3 = require("aws-cdk-lib");
var storePlugin = definePlugin({
  name: "store",
  schema: import_zod17.z.object({
    stacks: import_zod17.z.object({
      stores: import_zod17.z.array(ResourceIdSchema).optional()
    }).array()
  }),
  onStack({ stack, stackConfig, bind }) {
    (stackConfig.stores || []).forEach((id) => {
      const bucket = new import_aws_s32.Bucket(stack, toId("store", id), {
        bucketName: toName(stack, id),
        accessControl: import_aws_s32.BucketAccessControl.PRIVATE,
        removalPolicy: import_aws_cdk_lib3.RemovalPolicy.DESTROY
      });
      bind((lambda) => {
        bucket.grantReadWrite(lambda), addResourceEnvironment(stack, "store", id, lambda);
      });
    });
  }
});

// src/plugins/topic.ts
var import_zod18 = require("zod");
var import_aws_sns = require("aws-cdk-lib/aws-sns");
var import_aws_lambda_event_sources2 = require("aws-cdk-lib/aws-lambda-event-sources");
var import_aws_cdk_lib4 = require("aws-cdk-lib");
var import_aws_iam2 = require("aws-cdk-lib/aws-iam");
var topicPlugin = definePlugin({
  name: "topic",
  schema: import_zod18.z.object({
    stacks: import_zod18.z.object({
      topics: import_zod18.z.record(ResourceIdSchema, FunctionSchema).optional()
    }).array()
  }),
  onBootstrap({ config: config2, stack }) {
    const allTopicNames = config2.stacks.map((stack2) => {
      return Object.keys(stack2.topics || {});
    }).flat();
    const uniqueTopicNames = [...new Set(allTopicNames)];
    uniqueTopicNames.forEach((id) => {
      new import_aws_sns.Topic(stack, toId("topic", id), {
        topicName: `${config2.name}-${id}`,
        displayName: id
      });
    });
  },
  onStack(ctx) {
    const { config: config2, stack, stackConfig, bind } = ctx;
    bind((lambda) => {
      lambda.addToRolePolicy(new import_aws_iam2.PolicyStatement({
        actions: ["sns:publish"],
        resources: ["*"]
      }));
    });
    return Object.entries(stackConfig.topics || {}).map(([id, props]) => {
      const lambda = toFunction(ctx, id, props);
      const topic = import_aws_sns.Topic.fromTopicArn(
        stack,
        toId("topic", id),
        import_aws_cdk_lib4.Arn.format({
          arnFormat: import_aws_cdk_lib4.ArnFormat.NO_RESOURCE_NAME,
          service: "sns",
          resource: `${config2.name}-${id}`
        }, stack)
      );
      lambda.addEventSource(new import_aws_lambda_event_sources2.SnsEventSource(topic));
      return lambda;
    });
  }
});

// src/plugins/search.ts
var import_zod19 = require("zod");
var import_aws_opensearchserverless = require("aws-cdk-lib/aws-opensearchserverless");
var import_aws_iam3 = require("aws-cdk-lib/aws-iam");
var searchPlugin = definePlugin({
  name: "search",
  schema: import_zod19.z.object({
    stacks: import_zod19.z.object({
      searchs: import_zod19.z.array(ResourceIdSchema).optional()
    }).array()
  }),
  onStack({ stack, stackConfig, bind }) {
    (stackConfig.searchs || []).forEach((id) => {
      const collection = new import_aws_opensearchserverless.CfnCollection(stack, toId("search", id), {
        name: toName(stack, id),
        type: "SEARCH"
      });
      bind((lambda) => {
        lambda.addToRolePolicy(new import_aws_iam3.PolicyStatement({
          actions: ["aoss:APIAccessAll"],
          resources: [collection.attrArn]
        }));
      });
    });
  }
});

// src/plugins/index.ts
var defaultPlugins = [
  functionPlugin,
  cronPlugin,
  queuePlugin,
  tablePlugin,
  storePlugin,
  topicPlugin,
  searchPlugin
];

// src/stack/app-bootstrap.ts
var appBootstrapStack = ({ config: config2, app, assets }) => {
  const stack = new import_aws_cdk_lib5.Stack(app, "bootstrap", {
    stackName: `${config2.name}-bootstrap`
  });
  const plugins = [
    ...defaultPlugins,
    ...config2.plugins || []
  ];
  debug("Run plugin onBootstrap listeners");
  plugins.forEach((plugin) => plugin.onBootstrap?.({ config: config2, stack, app, assets }));
  return stack;
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
var createDependencyTree = (stacks, startingLevel) => {
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
  return findChildren(list3, [], startingLevel);
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
  id = 0;
  add(opts) {
    if (!this.assets[opts.stack.name]) {
      this.assets[opts.stack.name] = [];
    }
    this.assets[opts.stack.name].push({
      ...opts,
      id: this.id++
    });
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

// src/app.ts
var makeApp = (config2) => {
  return new import_aws_cdk_lib6.App({
    outdir: assemblyDir,
    defaultStackSynthesizer: new import_aws_cdk_lib6.DefaultStackSynthesizer({
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
var toApp = async (config2, filters) => {
  const assets = new Assets();
  const app = makeApp(config2);
  const stacks = [];
  const plugins = [
    ...defaultPlugins,
    ...config2.plugins || []
  ];
  debug("Plugins detected:", plugins.map((plugin) => style.info(plugin.name)).join(", "));
  debug("Run plugin onApp listeners");
  plugins.forEach((plugin) => plugin.onApp?.({ config: config2, app, assets }));
  debug("Stack filters:", filters.map((filter) => style.info(filter)).join(", "));
  const filterdStacks = filters.length === 0 ? config2.stacks : getAllDepends(
    // config.stacks,
    config2.stacks.filter((stack) => filters.includes(stack.name))
  );
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
  let dependencyTree;
  const bootstrap2 = appBootstrapStack({ config: config2, app, assets });
  if (bootstrap2.node.children.length === 0) {
    dependencyTree = createDependencyTree(stacks, 0);
  } else {
    dependencyTree = [{
      stack: bootstrap2,
      level: 0,
      children: createDependencyTree(stacks, 1)
    }];
  }
  return {
    app,
    assets,
    plugins,
    stackNames: filterdStacks.map((stack) => stack.name),
    dependencyTree
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
        style.attr(`${time}${style.attr.dim("ms")}`),
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
var import_path7 = require("path");

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

// src/schema/app.ts
var import_zod23 = require("zod");

// src/schema/stack.ts
var import_zod20 = require("zod");
var StackSchema = import_zod20.z.object({
  name: ResourceIdSchema,
  depends: import_zod20.z.array(import_zod20.z.lazy(() => StackSchema)).optional()
});

// src/schema/region.ts
var import_zod21 = require("zod");
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
var RegionSchema = import_zod21.z.enum(regions);

// src/schema/plugin.ts
var import_zod22 = require("zod");
var PluginSchema = import_zod22.z.object({
  name: import_zod22.z.string(),
  schema: import_zod22.z.custom().optional(),
  depends: import_zod22.z.array(import_zod22.z.lazy(() => PluginSchema)).optional(),
  onBootstrap: import_zod22.z.function().optional(),
  onStack: import_zod22.z.function().returns(import_zod22.z.any()).optional(),
  onApp: import_zod22.z.function().optional()
  // bind: z.function().optional(),
});

// src/schema/app.ts
var AppSchema = import_zod23.z.object({
  name: ResourceIdSchema,
  region: RegionSchema,
  profile: import_zod23.z.string(),
  stage: import_zod23.z.string().regex(/[a-z]+/).default("prod"),
  defaults: import_zod23.z.object({}).default({}),
  stacks: import_zod23.z.array(StackSchema).min(1),
  plugins: import_zod23.z.array(PluginSchema).optional()
});

// src/config.ts
var importConfig = async (options) => {
  debug("Import config file");
  const fileName = (0, import_path7.join)(process.cwd(), options.configFile || "awsless.config.ts");
  const module2 = await (0, import_ts_import.load)(fileName, {
    transpileOptions: {
      cache: {
        dir: (0, import_path7.join)(outDir, "config")
      }
    }
  });
  const appConfig = typeof module2.default === "function" ? await module2.default({
    profile: options.profile,
    region: options.region,
    stage: options.stage
  }) : module2.default;
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
  const config2 = await schema2.parseAsync(appConfig);
  debug("Final config:", config2.stacks);
  debug("Load credentials", style.info(config2.profile));
  const credentials = getCredentials(config2.profile);
  debug("Load AWS account ID");
  const account = await getAccountId(credentials, config2.region);
  debug("Account ID:", style.info(account));
  return {
    ...config2,
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

// src/cli/ui/layout/header.ts
var header = (config2) => {
  return [
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
      time.set(style.attr(diff) + style.attr.dim("ms"));
      stop();
      icon.set(style.success(symbol.success));
    };
  };
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
          this.output.cursorTo?.(x, y - 1 - start);
          this.output.write?.("\n" + line);
        } else {
          this.output.cursorTo?.(0, y - start);
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

// src/cli/ui/layout/logo.ts
var logo = () => {
  return [
    style.warning("\u26A1\uFE0F "),
    style.primary("AWS"),
    style.primary.dim("LESS"),
    br()
  ];
};

// src/cli/ui/layout/layout.ts
var layout = async (cb) => {
  const term = createTerminal();
  term.out.clear();
  term.out.write(logo());
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

// src/cli/ui/complex/asset.ts
var assetBuilder = (assets) => {
  return async (term) => {
    const done = term.out.write(loadingDialog("Building stack assets..."));
    const groups = new Signal([br()]);
    term.out.write(groups);
    const stackNameSize = Math.max(...Object.keys(assets.list()).map((stack) => stack.length));
    await Promise.all(assets.map(async (stack, assets2) => {
      const group = new Signal([]);
      groups.update((groups2) => [...groups2, group]);
      await Promise.all(assets2.map(async (asset) => {
        const [icon, stop] = createSpinner();
        const start = /* @__PURE__ */ new Date();
        const details = new Signal({});
        const line = flexLine(term, [
          icon,
          "  ",
          style.label(stack.name),
          " ".repeat(stackNameSize - stack.name.length),
          " ",
          style.placeholder(symbol.pointerSmall),
          " ",
          style.warning(asset.resource),
          " ",
          style.placeholder(symbol.pointerSmall),
          " ",
          style.info(asset.resourceName),
          " "
        ], [
          " ",
          derive([details], (details2) => {
            return Object.entries(details2).map(([key, value]) => {
              return `${style.label(key)}: ${value}`;
            }).join(" / ");
          }),
          br()
        ]);
        group.update((group2) => [...group2, line]);
        const data = await asset.build?.();
        const time = (/* @__PURE__ */ new Date()).getTime() - start.getTime();
        details.set({
          ...data,
          time: style.attr(time) + style.attr.dim("ms")
        });
        icon.set(style.success(symbol.success));
        stop();
      }));
    }));
    done("Done building stack assets");
  };
};

// src/util/cleanup.ts
var import_promises4 = require("fs/promises");
var cleanUp = async () => {
  debug("Clean up assembly & asset files");
  const paths = [
    assemblyDir,
    functionDir
  ];
  await Promise.all(paths.map((path) => (0, import_promises4.rm)(path, {
    recursive: true,
    force: true,
    maxRetries: 2
  })));
  await Promise.all(paths.map((path) => (0, import_promises4.mkdir)(path, {
    recursive: true
  })));
};

// src/cli/command/build.ts
var build = (program2) => {
  program2.command("build").argument("[stack...]", "Optionally filter stacks to build").description("Build your app").action(async (filters) => {
    await layout(async (config2, write) => {
      const { app, assets } = await toApp(config2, filters);
      await cleanUp();
      await write(assetBuilder(assets));
      app.synth();
    });
  });
};

// src/stack/client.ts
var import_client_cloudformation = require("@aws-sdk/client-cloudformation");
var import_client_s32 = require("@aws-sdk/client-s3");
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
    const client = new import_client_s32.S3Client({
      credentials: this.config.credentials,
      region: this.config.region
    });
    await client.send(new import_client_s32.PutObjectCommand({
      Bucket: assetBucketName(this.config),
      Key: `${stack.stackName}/cloudformation.json`,
      Body: JSON.stringify(stack.template),
      ACL: import_client_s32.ObjectCannedACL.private,
      StorageClass: import_client_s32.StorageClass.STANDARD_IA
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
          style.info(id),
          " "
        ], [
          // style.placeholder(' [ '),
          " ",
          status2,
          // style.placeholder(' ] '),
          br()
        ]);
        term.out.write(line);
        render(node.children, deep + 1, [...parents, more]);
      });
    };
    render(nodes);
  };
};

// src/cli/ui/__components/basic.ts
var br2 = () => {
  return "\n";
};

// src/cli/ui/__components/spinner.ts
var frames2 = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var length2 = frames2.length;
var createSpinner2 = () => {
  const index = new Signal(0);
  const frame = derive([index], (index2) => style.info(frames2[index2 % length2]));
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

// src/cli/ui/__components/dialog.ts
var dialog2 = (type, lines) => {
  const padding = 3;
  const icon = style[type](symbol[type].padEnd(padding));
  return lines.map((line, i) => {
    if (i === 0) {
      return icon + line;
    } else {
      return " ".repeat(padding) + line;
    }
  }).join(br2()) + br2();
};
var loadingDialog2 = (message) => {
  const [icon, stop] = createSpinner2();
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
      br2()
    ]);
    return (message2) => {
      const end = /* @__PURE__ */ new Date();
      const diff = end.getTime() - start.getTime();
      description.set(message2);
      time.set(style.attr(diff) + style.attr.dim("ms"));
      stop();
      icon.set(style.success(symbol.success));
    };
  };
};

// src/cli/command/status.ts
var status = (program2) => {
  program2.command("status").argument("[stacks...]", "Optionally filter stacks to lookup status").description("View the application status").action(async (filters) => {
    await layout(async (config2, write) => {
      const { app, assets, dependencyTree } = await toApp(config2, filters);
      await cleanUp();
      await write(assetBuilder(assets));
      write(br2());
      const assembly = app.synth();
      const doneLoading = write(loadingDialog2("Loading stack information..."));
      const client = new StackClient(config2);
      const statuses = [];
      const stackStatuses = {};
      assembly.stacks.forEach((stack) => {
        stackStatuses[stack.id] = new Signal(style.info("Loading..."));
      });
      write(br2());
      write(stackTree(dependencyTree, stackStatuses));
      write(br2());
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
        write(dialog2("warning", ["Your app has undeployed changes !!!"]));
      } else {
        write(dialog2("success", ["Your app has not been changed"]));
      }
    });
  });
};

// src/cli/command/deploy.ts
var deploy = (program2) => {
  program2.command("deploy").argument("[stacks...]", "Optionally filter stacks to deploy").description("Deploy your app to AWS").action(async (filters) => {
    await layout(async (config2, write) => {
      await write(bootstrapDeployer(config2));
      const { app, stackNames, assets, dependencyTree } = await toApp(config2, filters);
      const formattedFilter = stackNames.map((i) => style.info(i)).join(style.placeholder(", "));
      debug("Stacks to deploy", formattedFilter);
      const deployAll = filters.length === 0;
      const deploySingle = filters.length === 1;
      const confirm = await write(confirmPrompt(deployAll ? `Are you sure you want to deploy ${style.warning("all")} stacks?` : deploySingle ? `Are you sure you want to deploy the ${formattedFilter} stack?` : `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`));
      if (!confirm) {
        throw new Cancelled();
      }
      await cleanUp();
      await write(assetBuilder(assets));
      write(br());
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

// src/cli/command/config/set.ts
var set = (program2) => {
  program2.command("set <name>").description("Set a config value").action(async (name) => {
    await layout(async (config2, write) => {
      const params = new Params(config2);
      write(list({
        "Set config parameter": style.info(name)
      }));
      write(br());
      const value = await write(textPrompt("Enter config value"));
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
  config
  // diff,
  // remove,
  // test,
  // test2,
];
commands2.forEach((command) => command(program));

// src/bin.ts
program.parse(process.argv);
