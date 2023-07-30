#!/usr/bin/env node
import {
  definePlugin
} from "./chunk-PFTL6L4F.js";

// src/cli/program.ts
import { Command } from "commander";

// src/app.ts
import { App as App4, DefaultStackSynthesizer } from "aws-cdk-lib";

// src/stack.ts
import { Arn, Stack } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

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
  return `/${config.stage}/awsless/${config.name}`;
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

// src/stack.ts
var toStack = ({ config, assets, app, stackConfig, plugins }) => {
  const stackName = `${config.name}-${stackConfig.name}`;
  const stack = new Stack(app, stackConfig.name, {
    stackName,
    env: {
      account: config.account,
      region: config.region
    },
    tags: {
      APP: config.name,
      STAGE: config.stage,
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
    config,
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
  const allowConfigParameters = new PolicyStatement({
    actions: [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ],
    resources: [
      Arn.format({
        region: config.region,
        account: config.account,
        partition: "aws",
        service: "ssm",
        resource: "parameter",
        resourceName: configParameterPrefix(config)
      })
      // Fn.sub('arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter' + configParameterPrefix(config)),
    ]
  });
  functions.forEach((lambda) => lambda.addToRolePolicy(allowConfigParameters));
  return {
    stack,
    functions,
    bindings,
    depends: stackConfig.depends
  };
};

// src/util/path.ts
import { join } from "path";
var rootDir = process.cwd();
var outDir = join(rootDir, ".awsless");
var assemblyDir = join(outDir, "assembly");
var assetDir = join(outDir, "asset");
var cacheDir = join(outDir, "cache");

// src/stack/app-bootstrap.ts
import { Stack as Stack3 } from "aws-cdk-lib";

// src/plugins/cron/index.ts
import { z as z10 } from "zod";

// src/plugins/cron/schema/schedule.ts
import { Schedule } from "aws-cdk-lib/aws-events";
import { z } from "zod";
import { awsCronExpressionValidator } from "aws-cron-expression-validator";
var RateExpressionSchema = z.custom((value) => {
  return z.string().regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/).refine((rate) => {
    const [str] = rate.substring(5).split(" ");
    const number = parseInt(str);
    return number > 0;
  }).safeParse(value).success;
}, "Invalid rate expression").transform(Schedule.expression);
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
}).transform(Schedule.expression);
var ScheduleExpressionSchema = RateExpressionSchema.or(CronExpressionSchema);

// src/plugins/cron/index.ts
import { Rule } from "aws-cdk-lib/aws-events";

// src/util/resource.ts
import { paramCase, pascalCase } from "change-case";
var toId = (resource, id) => {
  return pascalCase(`${resource}-${id}`);
};
var toName = (stack, id) => {
  return paramCase(`${stack.stackName}-${id}`);
};
var toExportName = (name) => {
  return paramCase(name);
};
var toEnvKey = (resource, id) => {
  return `RESOURCE_${resource.toUpperCase()}_${id}`;
};
var addResourceEnvironment = (stack, resource, id, lambda) => {
  const key = toEnvKey(resource, id);
  const value = toName(stack, id);
  lambda.addEnvironment(key, value, {
    removeInEdge: true
  });
};

// src/plugins/function/index.ts
import { z as z9 } from "zod";

// src/schema/duration.ts
import { z as z2 } from "zod";
import { Duration as CDKDuration } from "aws-cdk-lib/core";
function toDuration(duration) {
  const [count, unit] = duration.split(" ");
  const countNum = parseInt(count);
  const unitLower = unit.toLowerCase();
  if (unitLower.startsWith("second")) {
    return CDKDuration.seconds(countNum);
  } else if (unitLower.startsWith("minute")) {
    return CDKDuration.minutes(countNum);
  } else if (unitLower.startsWith("hour")) {
    return CDKDuration.hours(countNum);
  } else if (unitLower.startsWith("day")) {
    return CDKDuration.days(countNum);
  }
  return CDKDuration.days(0);
}
var DurationSchema = z2.custom((value) => {
  return z2.string().regex(/[0-9]+ (seconds?|minutes?|hours?|days?)/).safeParse(value).success;
}, "Invalid duration").transform(toDuration);

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

// src/plugins/function/index.ts
import { Code, Function } from "aws-cdk-lib/aws-lambda";

// src/plugins/function/schema/runtime.ts
import { Runtime as CdkRuntime } from "aws-cdk-lib/aws-lambda";
import { z as z4 } from "zod";
var runtimes = {
  "container": CdkRuntime.FROM_IMAGE,
  "rust": CdkRuntime.PROVIDED_AL2,
  "nodejs16.x": CdkRuntime.NODEJS_16_X,
  "nodejs18.x": CdkRuntime.NODEJS_18_X,
  "python3.9": CdkRuntime.PYTHON_3_9,
  "python3.10": CdkRuntime.PYTHON_3_10,
  "go1.x": CdkRuntime.PROVIDED_AL2,
  "go": CdkRuntime.PROVIDED_AL2
};
var toRuntime = (runtime) => {
  return runtimes[runtime];
};
var RuntimeSchema = z4.enum(Object.keys(runtimes)).transform(toRuntime);

// src/plugins/function/schema/architecture.ts
import { Architecture as CdkArchitecture } from "aws-cdk-lib/aws-lambda";
import { z as z5 } from "zod";
var toArchitecture = (architecture) => {
  return architecture === "x86_64" ? CdkArchitecture.X86_64 : CdkArchitecture.ARM_64;
};
var ArchitectureSchema = z5.enum(["x86_64", "arm_64"]).transform(toArchitecture);

// src/schema/resource-id.ts
import { z as z6 } from "zod";
var ResourceIdSchema = z6.string().min(3).max(24).regex(/[a-z\-]+/, "Invalid resource ID");

// src/schema/size.ts
import { Size as CDKSize } from "aws-cdk-lib/core";
import { z as z7 } from "zod";
function toSize(size) {
  const [count, unit] = size.split(" ");
  const countNum = parseInt(count);
  if (unit === "KB") {
    return CDKSize.kibibytes(countNum);
  } else if (unit === "MB") {
    return CDKSize.mebibytes(countNum);
  } else if (unit === "GB") {
    return CDKSize.gibibytes(countNum);
  }
  throw new TypeError(`Invalid size ${size}`);
}
var SizeSchema = z7.custom((value) => {
  return z7.string().regex(/[0-9]+ (KB|MB|GB)/).safeParse(value).success;
}, "Invalid size").transform(toSize);

// src/plugins/function/util/build.ts
import JSZip from "jszip";
import { dirname, join as join2 } from "path";
import { mkdir, writeFile } from "fs/promises";
import { filesize } from "filesize";
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
var writeBuildHash = async (config, stack, id, hash) => {
  const funcPath = join2(assetDir, "function", config.name, stack.artifactId, id);
  const versionFile = join2(funcPath, "HASH");
  await writeFile(versionFile, hash);
};
var writeBuildFiles = async (config, stack, id, files) => {
  const bundle = await zipFiles(files);
  const funcPath = join2(assetDir, "function", config.name, stack.artifactId, id);
  const filesPath = join2(funcPath, "files");
  const bundleFile = join2(funcPath, "bundle.zip");
  debug("Bundle size of", style.info(join2(config.name, stack.artifactId, id)), "is", style.attr(filesize(bundle.byteLength)));
  await mkdir(filesPath, { recursive: true });
  await writeFile(bundleFile, bundle);
  await Promise.all(files.map(async (file) => {
    const fileName = join2(filesPath, file.name);
    await mkdir(dirname(fileName), { recursive: true });
    await writeFile(fileName, file.code);
    if (file.map) {
      const mapName = join2(filesPath, `${file.name}.map`);
      await writeFile(mapName, file.map);
    }
  }));
  return {
    file: bundleFile,
    size: bundle.byteLength
  };
};

// src/plugins/function/util/publish.ts
import { join as join3 } from "path";
import { readFile } from "fs/promises";
import { GetObjectCommand, ObjectCannedACL, PutObjectCommand, S3Client, StorageClass } from "@aws-sdk/client-s3";

// src/stack/bootstrap.ts
import { CfnOutput, RemovalPolicy, Stack as Stack2 } from "aws-cdk-lib";
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
var assetBucketName = (config) => {
  return `awsless-bootstrap-${config.account}-${config.region}`;
};
var assetBucketUrl = (config, stackName) => {
  const bucket = assetBucketName(config);
  return `https://s3-${config.region}.amazonaws.com/${bucket}/${stackName}/cloudformation.json`;
};
var version = "2";
var bootstrapStack = (config, app) => {
  const stack = new Stack2(app, "bootstrap", {
    stackName: `awsless-bootstrap`
  });
  new Bucket(stack, "assets", {
    bucketName: assetBucketName(config),
    versioned: true,
    accessControl: BucketAccessControl.PRIVATE,
    removalPolicy: RemovalPolicy.DESTROY
  });
  new CfnOutput(stack, "version", {
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
var publishFunctionAsset = async (config, stack, id) => {
  const bucket = assetBucketName(config);
  const key = `${config.name}/${stack.artifactId}/function/${id}.zip`;
  const funcPath = join3(assetDir, "function", config.name, stack.artifactId, id);
  const bundleFile = join3(funcPath, "bundle.zip");
  const hashFile = join3(funcPath, "HASH");
  const hash = await readFile(hashFile, "utf8");
  const file = await readFile(bundleFile);
  const client = new S3Client({
    credentials: config.credentials,
    region: config.region
  });
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
    return getResult.VersionId;
  }
  const putResult = await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ACL: ObjectCannedACL.private,
    StorageClass: StorageClass.STANDARD,
    Metadata: {
      hash
    }
  }));
  return putResult.VersionId;
};

// src/plugins/function/schema/retry-attempts.ts
import { z as z8 } from "zod";
var RetryAttempts = z8.number().int().min(0).max(2);

// src/util/byte-size.ts
import { filesize as filesize2 } from "filesize";
var formatByteSize = (size) => {
  const [number, unit] = filesize2(size).toString().split(" ");
  return style.attr(number) + style.attr.dim(unit);
};

// src/plugins/function/util/bundler/rollup.ts
import { rollup } from "rollup";
import { createHash } from "crypto";
import { swc } from "rollup-plugin-swc3";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
var rollupBuild = async (input) => {
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

// src/plugins/function/index.ts
var FunctionSchema = z9.union([
  LocalFileSchema,
  z9.object({
    file: LocalFileSchema,
    timeout: DurationSchema.optional(),
    runtime: RuntimeSchema.optional(),
    memorySize: SizeSchema.optional(),
    architecture: ArchitectureSchema.optional(),
    ephemeralStorageSize: SizeSchema.optional(),
    retryAttempts: RetryAttempts,
    environment: z9.record(z9.string(), z9.string()).optional()
  })
]);
var schema = z9.object({
  defaults: z9.object({
    function: z9.object({
      timeout: DurationSchema.default("10 seconds"),
      runtime: RuntimeSchema.default("nodejs18.x"),
      memorySize: SizeSchema.default("128 MB"),
      architecture: ArchitectureSchema.default("arm_64"),
      ephemeralStorageSize: SizeSchema.default("512 MB"),
      retryAttempts: RetryAttempts.default(2),
      environment: z9.record(z9.string(), z9.string()).optional()
    }).default({})
  }).default({}),
  stacks: z9.object({
    functions: z9.record(
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
var toFunction = ({ config, stack, assets }, id, fileOrProps) => {
  const props = typeof fileOrProps === "string" ? { ...config.defaults?.function, file: fileOrProps } : { ...config.defaults?.function, ...fileOrProps };
  const lambda = new Function(stack, toId("function", id), {
    functionName: toName(stack, id),
    handler: "index.default",
    code: Code.fromInline("export default () => {}"),
    ...props,
    memorySize: props.memorySize.toMebibytes()
  });
  lambda.addEnvironment("APP", config.name, { removeInEdge: true });
  lambda.addEnvironment("STAGE", config.stage, { removeInEdge: true });
  lambda.addEnvironment("STACK", stack.artifactId, { removeInEdge: true });
  if (lambda.runtime.toString().startsWith("nodejs")) {
    lambda.addEnvironment("AWS_NODEJS_CONNECTION_REUSE_ENABLED", "1", {
      removeInEdge: true
    });
  }
  assets.add({
    stackName: stack.artifactId,
    resource: "function",
    resourceName: id,
    async build() {
      const result = await rollupBuild(props.file);
      const bundle = await writeBuildFiles(config, stack, id, result.files);
      await writeBuildHash(config, stack, id, result.hash);
      const func = lambda.node.defaultChild;
      func.handler = result.handler;
      return {
        size: formatByteSize(bundle.size)
      };
    },
    async publish() {
      const version2 = await publishFunctionAsset(config, stack, id);
      const func = lambda.node.defaultChild;
      func.code = {
        s3Bucket: assetBucketName(config),
        s3Key: `${config.name}/${stack.artifactId}/function/${id}.zip`,
        s3ObjectVersion: version2
      };
    }
  });
  return lambda;
};

// src/plugins/cron/index.ts
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
var cronPlugin = definePlugin({
  name: "cron",
  schema: z10.object({
    stacks: z10.object({
      crons: z10.record(ResourceIdSchema, z10.object({
        consumer: FunctionSchema,
        schedule: ScheduleExpressionSchema,
        description: z10.string().max(512).optional()
      })).optional()
    }).array()
  }),
  onStack(context) {
    return Object.entries(context.stackConfig.crons || {}).map(([id, props]) => {
      const lambda = toFunction(context, id, props.consumer);
      const target = new LambdaFunction(lambda);
      new Rule(context.stack, toId("cron", id), {
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
import { z as z11 } from "zod";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
var queuePlugin = definePlugin({
  name: "queue",
  schema: z11.object({
    defaults: z11.object({
      queue: z11.object({
        // fifo: z.boolean().default(false),
        retentionPeriod: DurationSchema.default("7 days"),
        visibilityTimeout: DurationSchema.default("30 seconds"),
        deliveryDelay: DurationSchema.default("0 seconds"),
        receiveMessageWaitTime: DurationSchema.default("0 seconds"),
        maxMessageSize: SizeSchema.default("256 KB")
      }).default({})
    }).default({}),
    stacks: z11.object({
      queues: z11.record(ResourceIdSchema, z11.union([
        LocalFileSchema,
        z11.object({
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
    const { stack, config, stackConfig, bind } = ctx;
    return Object.entries(stackConfig.queues || {}).map(([id, functionOrProps]) => {
      const props = typeof functionOrProps === "string" ? { ...config.defaults.queue, consumer: functionOrProps } : { ...config.defaults.queue, ...functionOrProps };
      const queue2 = new Queue(stack, toId("queue", id), {
        queueName: toName(stack, id),
        ...props,
        maxMessageSizeBytes: props.maxMessageSize.toBytes()
      });
      const lambda = toFunction(ctx, id, props.consumer);
      lambda.addEventSource(new SqsEventSource(queue2));
      bind((lambda2) => {
        queue2.grantSendMessages(lambda2);
        addResourceEnvironment(stack, "queue", id, lambda2);
      });
      return lambda;
    });
  }
});

// src/plugins/table/index.ts
import { z as z16 } from "zod";
import { BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";

// src/plugins/table/schema/class-type.ts
import { TableClass } from "aws-cdk-lib/aws-dynamodb";
import { z as z12 } from "zod";
var types = {
  "standard": TableClass.STANDARD,
  "standard-infrequent-access": TableClass.STANDARD_INFREQUENT_ACCESS
};
var TableClassSchema = z12.enum(Object.keys(types)).transform((value) => {
  return types[value];
});

// src/plugins/table/schema/attribute.ts
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { z as z13 } from "zod";
var types2 = {
  string: AttributeType.STRING,
  number: AttributeType.NUMBER,
  binary: AttributeType.BINARY
};
var AttributeSchema = z13.enum(Object.keys(types2)).transform((value) => types2[value]);

// src/plugins/table/schema/key.ts
import { z as z14 } from "zod";
var KeySchema = z14.string().min(1).max(255);

// src/plugins/table/schema/projection-type.ts
import { ProjectionType } from "aws-cdk-lib/aws-dynamodb";
import { z as z15 } from "zod";
var types3 = {
  "all": ProjectionType.ALL,
  "keys-only": ProjectionType.KEYS_ONLY
};
var ProjectionTypeSchema = z15.union([
  z15.enum(Object.keys(types3)).transform((value) => ({
    ProjectionType: types3[value]
  })),
  z15.array(KeySchema).min(0).max(20).transform((keys) => ({
    ProjectionType: ProjectionType.INCLUDE,
    NonKeyAttributes: keys
  }))
]);

// src/plugins/table/index.ts
var tablePlugin = definePlugin({
  name: "table",
  schema: z16.object({
    stacks: z16.object({
      tables: z16.record(
        ResourceIdSchema,
        z16.object({
          hash: KeySchema,
          sort: KeySchema.optional(),
          fields: z16.record(z16.string(), AttributeSchema),
          class: TableClassSchema.default("standard"),
          pointInTimeRecovery: z16.boolean().default(false),
          timeToLiveAttribute: z16.string().optional(),
          indexes: z16.record(z16.string(), z16.object({
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
      const table = new Table(stack, toId("table", id), {
        tableName: toName(stack, id),
        partitionKey: buildKey(props.hash),
        sortKey: props.sort ? buildKey(props.sort) : void 0,
        billingMode: BillingMode.PAY_PER_REQUEST,
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
import { z as z17 } from "zod";
import { Bucket as Bucket2, BucketAccessControl as BucketAccessControl2 } from "aws-cdk-lib/aws-s3";
import { RemovalPolicy as RemovalPolicy2 } from "aws-cdk-lib";
var storePlugin = definePlugin({
  name: "store",
  schema: z17.object({
    stacks: z17.object({
      stores: z17.array(ResourceIdSchema).optional()
    }).array()
  }),
  onStack({ stack, stackConfig, bind }) {
    (stackConfig.stores || []).forEach((id) => {
      const bucket = new Bucket2(stack, toId("store", id), {
        bucketName: toName(stack, id),
        accessControl: BucketAccessControl2.PRIVATE,
        removalPolicy: RemovalPolicy2.DESTROY
      });
      bind((lambda) => {
        bucket.grantReadWrite(lambda), addResourceEnvironment(stack, "store", id, lambda);
      });
    });
  }
});

// src/plugins/topic.ts
import { z as z18 } from "zod";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Arn as Arn2, ArnFormat } from "aws-cdk-lib";
var topicPlugin = definePlugin({
  name: "topic",
  schema: z18.object({
    stacks: z18.object({
      topics: z18.record(ResourceIdSchema, FunctionSchema).optional()
    }).array()
  }),
  onBootstrap({ config, stack }) {
    const allTopicNames = config.stacks.map((stack2) => {
      return Object.keys(stack2.topics || {});
    }).flat();
    const uniqueTopicNames = [...new Set(allTopicNames)];
    uniqueTopicNames.forEach((id) => {
      new Topic(stack, toId("topic", id), {
        topicName: `${config.name}-${id}`,
        displayName: id
      });
    });
  },
  onStack(ctx) {
    const { config, stack, stackConfig, bind } = ctx;
    return Object.entries(stackConfig.topics || {}).map(([id, props]) => {
      const lambda = toFunction(ctx, id, props);
      const topic = Topic.fromTopicArn(
        stack,
        toId("topic", id),
        Arn2.format({
          arnFormat: ArnFormat.NO_RESOURCE_NAME,
          service: "sns",
          resource: `${config.name}-${id}`
        }, stack)
      );
      lambda.addEventSource(new SnsEventSource(topic));
      bind((lambda2) => {
        addResourceEnvironment(stack, "topic", id, lambda2);
        topic.grantPublish(lambda2);
      });
      return lambda;
    });
  }
});

// src/plugins/graphql/index.ts
import { z as z20 } from "zod";
import { AuthorizationType, CfnGraphQLApi, CfnGraphQLSchema, GraphqlApi, MappingTemplate } from "aws-cdk-lib/aws-appsync";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2 } from "fs/promises";

// src/util/array.ts
var toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};

// src/plugins/graphql/index.ts
import { dirname as dirname2, join as join4 } from "path";
import { print } from "graphql";
import { paramCase as paramCase2 } from "change-case";

// src/plugins/graphql/schema/resolver-field.ts
import { z as z19 } from "zod";
var ResolverFieldSchema = z19.custom((value) => {
  return z19.string().regex(/([a-z0-9\_]+)(\s){1}([a-z0-9\_]+)/gi).safeParse(value).success;
}, `Invalid resolver field. Valid example: "Query list"`);

// src/plugins/graphql/index.ts
import { CfnOutput as CfnOutput2, Fn } from "aws-cdk-lib";
var graphqlPlugin = definePlugin({
  name: "graphql",
  schema: z20.object({
    defaults: z20.object({
      graphql: z20.record(ResourceIdSchema, z20.object({
        authorization: z20.object({
          authorizer: FunctionSchema,
          ttl: DurationSchema.default("1 hour")
        }).optional(),
        mappingTemplate: z20.object({
          request: LocalFileSchema.optional(),
          response: LocalFileSchema.optional()
        }).optional()
      })).optional()
    }).default({}),
    stacks: z20.object({
      graphql: z20.record(ResourceIdSchema, z20.object({
        schema: z20.union([
          LocalFileSchema,
          z20.array(LocalFileSchema).min(1)
        ]).optional(),
        resolvers: z20.record(ResolverFieldSchema, FunctionSchema).optional()
      })).optional()
    }).array()
  }),
  onBootstrap({ config, stack, assets }) {
    const list3 = /* @__PURE__ */ new Set();
    Object.values(config.stacks).forEach((stackConfig) => {
      Object.keys(stackConfig.graphql || {}).forEach((id) => {
        list3.add(id);
      });
    });
    list3.forEach((id) => {
      const file = join4(assetDir, "graphql", config.name, id, "schema.graphql");
      const authorization = config.defaults.graphql?.[id]?.authorization;
      const authProps = {};
      if (authorization) {
        const authorizer = toFunction({ config, assets, stack }, `${id}-authorizer`, authorization.authorizer);
        authProps.additionalAuthenticationProviders = [{
          authenticationType: AuthorizationType.LAMBDA,
          lambdaAuthorizerConfig: {
            authorizerUri: authorizer.functionArn,
            authorizerResultTtlInSeconds: authorization.ttl.toSeconds()
          }
        }];
      }
      const api = new CfnGraphQLApi(stack, toId("graphql", id), {
        ...authProps,
        name: toName(stack, id),
        authenticationType: AuthorizationType.API_KEY
      });
      new CfnOutput2(stack, toId("output", id), {
        exportName: toId("graphql", id),
        value: api.attrApiId
      });
      assets.add({
        stackName: stack.artifactId,
        resource: "schema",
        resourceName: id,
        async build() {
          const schemas = [];
          await Promise.all(Object.values(config.stacks).map(async (stackConfig) => {
            const schemaFiles = toArray(stackConfig.graphql?.[id].schema || []);
            await Promise.all(schemaFiles.map(async (schemaFile) => {
              const schema3 = await readFile2(schemaFile, "utf8");
              schemas.push(schema3);
            }));
          }));
          const schema2 = print(mergeTypeDefs(schemas));
          await mkdir2(dirname2(file), { recursive: true });
          await writeFile2(file, schema2);
          new CfnGraphQLSchema(stack, toId("schema", id), {
            apiId: api.attrApiId,
            definition: schema2
          });
        }
      });
    });
  },
  onStack(ctx) {
    const { config, stack, stackConfig } = ctx;
    return Object.entries(stackConfig.graphql || {}).map(([id, props]) => {
      const defaults = config.defaults.graphql?.[id] || {};
      return Object.entries(props.resolvers || {}).map(([typeAndField, functionProps]) => {
        const api = GraphqlApi.fromGraphqlApiAttributes(stack, toId("graphql", id), {
          graphqlApiId: Fn.importValue(toId("graphql", id))
        });
        const [typeName, fieldName] = typeAndField.split(/[\s]+/g);
        const functionId = paramCase2(`${id}-${typeName}-${fieldName}`);
        const lambda = toFunction(ctx, functionId, functionProps);
        const source = api.addLambdaDataSource(toId("data-source", functionId), lambda, {
          name: toId("data-source", functionId)
        });
        source.createResolver(toId("resolver", functionId), {
          typeName,
          fieldName,
          requestMappingTemplate: defaults.mappingTemplate?.request ? MappingTemplate.fromFile(defaults.mappingTemplate.request) : MappingTemplate.lambdaRequest(),
          responseMappingTemplate: defaults.mappingTemplate?.response ? MappingTemplate.fromFile(defaults.mappingTemplate.response) : MappingTemplate.lambdaResult()
        });
        return lambda;
      });
    }).flat();
  }
});

// src/plugins/pubsub.ts
import { z as z21 } from "zod";
import { CfnTopicRule } from "aws-cdk-lib/aws-iot";
import { PolicyStatement as PolicyStatement2 } from "aws-cdk-lib/aws-iam";
import { snakeCase } from "change-case";
var pubsubPlugin = definePlugin({
  name: "pubsub",
  schema: z21.object({
    stacks: z21.object({
      pubsub: z21.record(ResourceIdSchema, z21.object({
        sql: z21.string(),
        sqlVersion: z21.enum(["2015-10-08", "2016-03-23", "beta"]).default("2016-03-23"),
        consumer: FunctionSchema
      })).optional()
    }).array()
  }),
  onStack(ctx) {
    const { stack, stackConfig, bind } = ctx;
    bind((lambda) => {
      lambda.addToRolePolicy(new PolicyStatement2({
        actions: ["iot:publish"],
        resources: ["*"]
      }));
    });
    return Object.entries(stackConfig.pubsub || {}).map(([id, props]) => {
      const lambda = toFunction(ctx, id, props.consumer);
      new CfnTopicRule(stack, toId("pubsub", id), {
        ruleName: snakeCase(toName(stack, id)),
        topicRulePayload: {
          sql: props.sql,
          awsIotSqlVersion: props.sqlVersion,
          actions: [{
            lambda: {
              functionArn: lambda.functionArn
            }
          }]
        }
      });
      return lambda;
    });
  }
});

// src/plugins/http.ts
import { z as z22 } from "zod";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationListener, ApplicationListenerRule, ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, ListenerAction, ListenerCondition } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { HostedZone, RecordSet, RecordType, RecordTarget } from "aws-cdk-lib/aws-route53";
import { LoadBalancerTarget } from "aws-cdk-lib/aws-route53-targets";
import { LambdaTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { CfnOutput as CfnOutput3, Fn as Fn2, Token } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { paramCase as paramCase3 } from "change-case";
var RouteSchema = z22.custom((route) => {
  return z22.string().regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/]*)$/ig).safeParse(route).success;
}, "Invalid route");
var generatePriority = (id, route) => {
  const start = parseInt(Buffer.from(id, "utf8").toString("hex"), 16) % 500 + 1;
  const end = parseInt(Buffer.from(route, "utf8").toString("hex"), 16) % 100;
  debug("PRIORITY", id, start, route, end, parseInt(`${start}${end}`, 10));
  return parseInt(`${start}${end}`, 10);
};
var httpPlugin = definePlugin({
  name: "http",
  schema: z22.object({
    defaults: z22.object({
      http: z22.record(
        ResourceIdSchema,
        z22.object({
          domain: z22.string(),
          subDomain: z22.string()
        })
      ).optional()
    }).default({}),
    stacks: z22.object({
      http: z22.record(
        ResourceIdSchema,
        z22.record(RouteSchema, FunctionSchema)
      ).optional()
    }).array()
  }),
  onBootstrap({ stack, config }) {
    const vpc = new Vpc(stack, toId("vpc", "http"), {
      subnetConfiguration: [{
        name: "public",
        subnetType: SubnetType.PUBLIC,
        cidrMask: 24
      }],
      availabilityZones: [
        config.region + "a",
        config.region + "b",
        config.region + "c"
      ]
    });
    const securityGroup = new SecurityGroup(stack, toId("security-group", "http"), {
      vpc
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443));
    new CfnOutput3(stack, toId("output", "http-vpc"), {
      exportName: "http-vpc-id",
      value: vpc.vpcId
    });
    new CfnOutput3(stack, toId("output", "http-security-group"), {
      exportName: "http-security-group-id",
      value: securityGroup.securityGroupId
    });
    Object.entries(config.defaults?.http || {}).forEach(([id, props]) => {
      const loadBalancer = new ApplicationLoadBalancer(stack, toId("load-balancer", id), {
        vpc,
        securityGroup
      });
      const zone = HostedZone.fromHostedZoneAttributes(
        stack,
        toId("hosted-zone", id),
        {
          // hostedZoneId: Fn.importValue(toExportName(`hosted-zone-${props.domain}-id`)),
          // hostedZoneId: Token.asString(Fn.ref(toId('hosted-zone', props.domain))),
          hostedZoneId: Token.asString(Fn2.ref(toId("hosted-zone", props.domain))),
          zoneName: props.domain + "."
        }
      );
      const certificate = Certificate.fromCertificateArn(
        stack,
        toId("certificate", id),
        Token.asString(Fn2.ref(toId("certificate", props.domain)))
      );
      const target = RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer));
      const recordName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain;
      new RecordSet(stack, toId("record-set", id), {
        zone,
        target,
        recordName,
        recordType: RecordType.A
      });
      const listener = loadBalancer.addListener(toId("listener", id), {
        port: 443,
        protocol: ApplicationProtocol.HTTPS,
        certificates: [certificate],
        defaultAction: ListenerAction.fixedResponse(404, {
          contentType: "application/json",
          messageBody: JSON.stringify({
            message: "Route not found"
          })
        })
      });
      new CfnOutput3(stack, toId("output", `http-${id}-listener`), {
        exportName: `http-${id}-listener-arn`,
        value: listener.listenerArn
      });
    });
  },
  onStack(ctx) {
    const { config, stack, stackConfig } = ctx;
    return Object.entries(stackConfig.http || {}).map(([id, routes]) => {
      const listener = ApplicationListener.fromApplicationListenerAttributes(stack, toId("listener", id), {
        listenerArn: Fn2.importValue(`http-${id}-listener-arn`),
        securityGroup: SecurityGroup.fromLookupById(
          stack,
          toId("security-group", id),
          "http-security-group-id"
        )
      });
      return Object.entries(routes).map(([route, props]) => {
        const lambda = toFunction(ctx, paramCase3(route), props);
        const [method, ...paths] = route.split(" ");
        const path = paths.join(" ");
        new ApplicationListenerRule(stack, toId("listener-rule", route), {
          listener,
          priority: generatePriority(id, route),
          action: ListenerAction.forward([
            new ApplicationTargetGroup(stack, toId("target-group", route), {
              targets: [new LambdaTarget(lambda)]
            })
          ]),
          conditions: [
            ListenerCondition.httpRequestMethods([method]),
            ListenerCondition.pathPatterns([path])
          ]
        });
        return lambda;
      });
    }).flat();
  }
});

// src/plugins/domain/index.ts
import { z as z25 } from "zod";
import { HostedZone as HostedZone2, CfnRecordSetGroup } from "aws-cdk-lib/aws-route53";
import { Certificate as Certificate2, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";

// src/plugins/domain/schema/record-type.ts
import { RecordType as RecordType2 } from "aws-cdk-lib/aws-route53";
import { z as z23 } from "zod";
var types4 = {
  "A": RecordType2.A,
  "AAAA": RecordType2.AAAA,
  "MX": RecordType2.MX,
  "TXT": RecordType2.TXT,
  "CNAME": RecordType2.CNAME
};
var RecordTypeSchema = z23.enum(Object.keys(types4)).transform((value) => types4[value]);

// src/plugins/domain/schema/domain-name.ts
import { z as z24 } from "zod";
var DomainNameSchema = z24.string().regex(/[a-z\-\_\.]/g, "Invalid domain name");

// src/plugins/domain/index.ts
import { CfnOutput as CfnOutput4 } from "aws-cdk-lib";
var domainPlugin = definePlugin({
  name: "domain",
  schema: z25.object({
    domains: z25.record(DomainNameSchema, z25.object({
      name: DomainNameSchema.optional(),
      type: RecordTypeSchema,
      ttl: DurationSchema,
      records: z25.string().array()
    }).array()).optional()
  }),
  onBootstrap({ config, stack }) {
    Object.entries(config.domains || {}).forEach(([domain, dnsRecords]) => {
      const hostedZone = new HostedZone2(stack, toId("hosted-zone", domain), {
        zoneName: domain,
        addTrailingDot: true
      });
      hostedZone.node.defaultChild.overrideLogicalId(toId("hosted-zone", domain));
      const certificate = new Certificate2(stack, toId("certificate", domain), {
        domainName: domain,
        validation: CertificateValidation.fromDns(hostedZone),
        subjectAlternativeNames: [`*.${domain}`]
      });
      certificate.node.defaultChild.overrideLogicalId(toId("certificate", domain));
      new CfnOutput4(stack, toId("output-hosted-zone", domain), {
        exportName: toExportName(`hosted-zone-${domain}-id`),
        value: hostedZone.hostedZoneId
      });
      new CfnOutput4(stack, toId("output-certificate", domain), {
        exportName: toExportName(`certificate-${domain}-arn`),
        value: certificate.certificateArn
      });
      if (dnsRecords.length > 0) {
        new CfnRecordSetGroup(stack, toId("record-set-group", domain), {
          hostedZoneId: hostedZone.hostedZoneId,
          recordSets: dnsRecords.map((props) => ({
            name: props.name || "",
            type: props.type,
            ttl: props.ttl.toSeconds().toString(),
            resourceRecords: props.records
          }))
        });
      }
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
  // searchPlugin,
  graphqlPlugin,
  pubsubPlugin,
  domainPlugin,
  httpPlugin
];

// src/stack/app-bootstrap.ts
var appBootstrapStack = ({ config, app, assets }) => {
  const stack = new Stack3(app, "bootstrap", {
    stackName: `${config.name}-bootstrap`
  });
  const plugins = [
    ...defaultPlugins,
    ...config.plugins || []
  ];
  debug("Run plugin onBootstrap listeners");
  const functions = plugins.map((plugin) => plugin.onBootstrap?.({
    config,
    app,
    stack,
    assets
  })).filter(Boolean).flat().filter(Boolean);
  return {
    stack,
    functions
  };
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
  const list3 = stacks.map(({ stack, config }) => ({
    stack,
    depends: config?.depends?.map((dep) => dep.name) || []
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
    if (!this.assets[opts.stackName]) {
      this.assets[opts.stackName] = [];
    }
    this.assets[opts.stackName].push({
      ...opts,
      id: this.id++
    });
  }
  list() {
    return this.assets;
  }
  forEach(cb) {
    Object.values(this.assets).forEach((assets) => {
      cb(assets[0].stackName, assets);
    });
  }
  map(cb) {
    return Object.values(this.assets).map((assets) => {
      return cb(assets[0].stackName, assets);
    });
  }
};

// src/app.ts
var makeApp = (config) => {
  return new App4({
    outdir: assemblyDir,
    defaultStackSynthesizer: new DefaultStackSynthesizer({
      fileAssetsBucketName: assetBucketName(config),
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
var toApp = async (config, filters) => {
  const assets = new Assets();
  const app = makeApp(config);
  const stacks = [];
  const plugins = [
    ...defaultPlugins,
    ...config.plugins || []
  ];
  debug("Plugins detected:", plugins.map((plugin) => style.info(plugin.name)).join(", "));
  debug("Run plugin onApp listeners");
  plugins.forEach((plugin) => plugin.onApp?.({ config, app, assets }));
  const bootstrap2 = appBootstrapStack({ config, app, assets });
  debug("Stack filters:", filters.map((filter) => style.info(filter)).join(", "));
  const filterdStacks = filters.length === 0 ? config.stacks : getAllDepends(
    // config.stacks,
    config.stacks.filter((stack) => filters.includes(stack.name))
  );
  for (const stackConfig of filterdStacks) {
    const { stack, bindings } = toStack({
      config,
      stackConfig,
      assets,
      plugins,
      app
    });
    stacks.push({ stack, config: stackConfig });
    bindings.forEach((cb) => bootstrap2.functions.forEach(cb));
  }
  let dependencyTree;
  if (bootstrap2.stack.node.children.length === 0) {
    dependencyTree = createDependencyTree(stacks, 0);
  } else {
    dependencyTree = [{
      stack: bootstrap2.stack,
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

// src/config.ts
import { join as join6 } from "path";

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
import { z as z29 } from "zod";

// src/schema/stack.ts
import { z as z26 } from "zod";
var StackSchema = z26.object({
  name: ResourceIdSchema,
  depends: z26.array(z26.lazy(() => StackSchema)).optional()
});

// src/schema/region.ts
import { z as z27 } from "zod";
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
var RegionSchema = z27.enum(regions);

// src/schema/plugin.ts
import { z as z28 } from "zod";
var PluginSchema = z28.object({
  name: z28.string(),
  schema: z28.custom().optional(),
  // depends: z.array(z.lazy(() => PluginSchema)).optional(),
  onBootstrap: z28.function().returns(z28.any()).optional(),
  onStack: z28.function().returns(z28.any()).optional(),
  onApp: z28.function().returns(z28.void()).optional()
  // bind: z.function().optional(),
});

// src/schema/app.ts
var AppSchema = z29.object({
  name: ResourceIdSchema,
  region: RegionSchema,
  profile: z29.string(),
  stage: z29.string().regex(/[a-z]+/).default("prod"),
  defaults: z29.object({}).default({}),
  stacks: z29.array(StackSchema).min(1),
  plugins: z29.array(PluginSchema).optional()
});

// src/util/import.ts
import { transformFile } from "@swc/core";
import { dirname as dirname3, join as join5 } from "path";
import { lstat, mkdir as mkdir3, writeFile as writeFile3 } from "fs/promises";
var resolveFileNameExtension = async (path) => {
  const options = [
    "",
    ".ts",
    ".js",
    "/index.ts",
    "/index.js"
  ];
  for (const option of options) {
    const file = path + option;
    let stat;
    try {
      stat = await lstat(file);
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
  return dirname3(path).replace(rootDir + "/", "");
};
var importFile = async (path) => {
  const load = async (file) => {
    let { code: code2 } = await transformFile(file, {
      isModule: true
    });
    const path2 = dirname3(file);
    const dir = resolveDir(file);
    code2 = code2.replaceAll("__dirname", `"${dir}"`);
    const matches = code2.match(/import\s*{\s*[a-z0-9\_]+\s*}\s*from\s*('|")(\.[\/a-z0-9\_\-]+)('|");?/ig);
    if (!matches)
      return code2;
    await Promise.all(matches?.map(async (match) => {
      const parts = /('|")(\.[\/a-z0-9\_\-]+)('|")/ig.exec(match);
      const from = parts[2];
      const file2 = await resolveFileNameExtension(join5(path2, from));
      const result = await load(file2);
      code2 = code2.replace(match, result);
    }));
    return code2;
  };
  const code = await load(path);
  const outputFile = join5(outDir, "config.js");
  await mkdir3(outDir, { recursive: true });
  await writeFile3(outputFile, code);
  return import(outputFile);
};

// src/config.ts
var importConfig = async (options) => {
  debug("Import config file");
  const fileName = join6(process.cwd(), options.configFile || "awsless.config.ts");
  const module = await importFile(fileName);
  const appConfig = typeof module.default === "function" ? await module.default({
    profile: options.profile,
    region: options.region,
    stage: options.stage
  }) : module.default;
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
    const groups = new Signal([""]);
    term.out.gap();
    term.out.write(groups);
    const stackNameSize = Math.max(...Object.keys(assets.list()).map((stack) => stack.length));
    const resourceSize = Math.max(...Object.values(assets.list()).map((assets2) => assets2.map((asset) => asset.resource.length)).flat());
    await Promise.all(assets.map(async (stackName, assets2) => {
      const group = new Signal([]);
      groups.update((groups2) => [...groups2, group]);
      await Promise.all(assets2.map(async (asset) => {
        const [icon, stop] = createSpinner();
        const details = new Signal({});
        const line = flexLine(term, [
          icon,
          "  ",
          style.label(stackName),
          " ".repeat(stackNameSize - stackName.length),
          " ",
          style.placeholder(symbol.pointerSmall),
          " ",
          style.warning(asset.resource),
          " ".repeat(resourceSize - asset.resource.length),
          " ",
          style.placeholder(symbol.pointerSmall),
          " ",
          style.info(asset.resourceName),
          " "
        ], [
          " ",
          derive([details], (details2) => {
            return Object.entries(details2).map(([key, value]) => {
              return `${style.label(key)} ${value}`;
            }).join(" / ");
          }),
          br()
        ]);
        group.update((group2) => [...group2, line]);
        const timer = createTimer();
        const data = await asset.build?.();
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
import { mkdir as mkdir4, rm } from "fs/promises";
var cleanUp = async () => {
  debug("Clean up assembly & asset files");
  const paths = [
    assemblyDir,
    assetDir,
    cacheDir
  ];
  await Promise.all(paths.map((path) => rm(path, {
    recursive: true,
    force: true,
    maxRetries: 2
  })));
  await Promise.all(paths.map((path) => mkdir4(path, {
    recursive: true
  })));
};

// src/cli/command/build.ts
var build = (program2) => {
  program2.command("build").argument("[stack...]", "Optionally filter stacks to build").description("Build your app").action(async (filters) => {
    await layout(async (config, write) => {
      const { app, assets } = await toApp(config, filters);
      await cleanUp();
      await write(assetBuilder(assets));
      app.synth();
    });
  });
};

// src/stack/client.ts
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand, GetTemplateCommand, OnFailure, TemplateStage, UpdateStackCommand, ValidateTemplateCommand, waitUntilStackCreateComplete, waitUntilStackDeleteComplete, waitUntilStackUpdateComplete } from "@aws-sdk/client-cloudformation";
import { S3Client as S3Client2, PutObjectCommand as PutObjectCommand2, ObjectCannedACL as ObjectCannedACL2, StorageClass as StorageClass2 } from "@aws-sdk/client-s3";
var StackClient = class {
  // 30 seconds
  constructor(config) {
    this.config = config;
    this.client = new CloudFormationClient({
      credentials: config.credentials,
      region: config.region
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
    const client = new S3Client2({
      credentials: this.config.credentials,
      region: this.config.region
    });
    await client.send(new PutObjectCommand2({
      Bucket: assetBucketName(this.config),
      Key: `${stack.stackName}/cloudformation.json`,
      Body: JSON.stringify(stack.template),
      ACL: ObjectCannedACL2.private,
      StorageClass: StorageClass2.STANDARD_IA
    }));
  }
  async create(stack, capabilities) {
    debug("Create the", style.info(stack.id), "stack");
    await this.client.send(new CreateStackCommand({
      StackName: stack.stackName,
      EnableTerminationProtection: false,
      OnFailure: OnFailure.DELETE,
      Capabilities: capabilities,
      ...this.templateProp(stack)
    }));
    await waitUntilStackCreateComplete({
      client: this.client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: stack.stackName
    });
  }
  async update(stack, capabilities) {
    debug("Update the", style.info(stack.id), "stack");
    await this.client.send(new UpdateStackCommand({
      StackName: stack.stackName,
      Capabilities: capabilities,
      ...this.templateProp(stack)
    }));
    await waitUntilStackUpdateComplete({
      client: this.client,
      maxWaitTime: this.maxWaitTime,
      maxDelay: this.maxDelay
    }, {
      StackName: stack.stackName
    });
  }
  async validate(stack) {
    debug("Validate the", style.info(stack.id), "stack");
    const result = await this.client.send(new ValidateTemplateCommand({
      ...this.templateProp(stack)
    }));
    return result.Capabilities;
  }
  async get(name) {
    debug("Get stack info for:", style.info(name));
    let result;
    try {
      result = await this.client.send(new DescribeStacksCommand({
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
    const resultTemplate = await this.client.send(new GetTemplateCommand({
      StackName: name,
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
    await this.client.send(new DeleteStackCommand({
      StackName: name
    }));
    await waitUntilStackDeleteComplete({
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
var bootstrapDeployer = (config) => {
  return async (term) => {
    debug("Initializing bootstrap");
    const app = makeApp(config);
    const client = new StackClient(config);
    const bootstrap2 = bootstrapStack(config, app);
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
      const { app, assets, dependencyTree } = await toApp(config, filters);
      await cleanUp();
      await write(assetBuilder(assets));
      const assembly = app.synth();
      const doneLoading = write(loadingDialog("Loading stack information..."));
      const client = new StackClient(config);
      const statuses = [];
      const stackStatuses = {};
      assembly.stacks.forEach((stack) => {
        stackStatuses[stack.id] = new Signal(style.info("Loading..."));
      });
      write(stackTree(dependencyTree, stackStatuses));
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
    await layout(async (config, write, term) => {
      await write(bootstrapDeployer(config));
      const { app, stackNames, assets, dependencyTree } = await toApp(config, filters);
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
      write(stackTree(dependencyTree, statuses));
      const client = new StackClient(config);
      const deploymentLine = createDeploymentLine(dependencyTree);
      for (const stacks of deploymentLine) {
        const results = await Promise.allSettled(stacks.map(async (stack) => {
          const signal = statuses[stack.artifactId];
          const stackArtifect = assembly.stacks.find((item) => item.id === stack.artifactId);
          signal.set(style.warning("deploying"));
          try {
            await client.deploy(stackArtifect);
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

// src/cli/program.ts
var program = new Command();
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
  secrets
  // diff,
  // remove,
  // test,
  // test2,
];
commands2.forEach((command) => command(program));

// src/bin.ts
program.parse(process.argv);
