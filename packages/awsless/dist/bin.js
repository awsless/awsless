#!/usr/bin/env node
import {
  __require,
  definePlugin
} from "./chunk-6KILQ5DR.js";

// src/cli/program.ts
import { Command } from "commander";

// src/app.ts
import { App as App4, DefaultStackSynthesizer } from "aws-cdk-lib";

// src/stack.ts
import { Fn, Stack } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

// src/cli/style.ts
import chalk from "chalk";
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
import { DeleteParameterCommand, GetParameterCommand, GetParametersByPathCommand, ParameterType, PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
var configParameterPrefix = (config2) => {
  return `/${config2.stage}/awsless/${config2.name}`;
};
var Params = class {
  constructor(config2) {
    this.config = config2;
    this.client = new SSMClient({
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
var toStack = ({ config: config2, assets, app, stackConfig, plugins }) => {
  const stackName = `${config2.name}-${stackConfig.name}`;
  const stack = new Stack(app, stackConfig.name, {
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
  const allowTopicPublish = new PolicyStatement({
    actions: ["sns:publish"],
    resources: ["*"]
  });
  functions.forEach((lambda) => lambda.addToRolePolicy(allowTopicPublish));
  const allowConfigParameters = new PolicyStatement({
    actions: [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ],
    resources: [
      Fn.sub("arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter" + configParameterPrefix(config2))
    ]
  });
  functions.forEach((lambda) => lambda.addToRolePolicy(allowConfigParameters));
  return {
    stack,
    depends: stackConfig.depends
  };
};

// src/util/path.ts
import { join } from "path";
var rootDir = process.cwd();
var outDir = join(rootDir, ".awsless");
var assemblyDir = join(outDir, "assembly");
var functionDir = join(outDir, "function");

// src/stack/app-bootstrap.ts
import { Stack as Stack4 } from "aws-cdk-lib";

// src/plugins/cron.ts
import { z as z10 } from "zod";

// src/schema/schedule.ts
import { Schedule } from "aws-cdk-lib/aws-events";
import { z } from "zod";
var RateExpressionSchema = z.custom((value) => {
  return z.string().regex(/rate\([0-9]+ (seconds?|minutes?|hours?|days?)\)/, "Invalid rate expression").refine((rate) => {
    const [str] = rate.substring(5).split(" ");
    const number = parseInt(str);
    return number > 0;
  }, "Rate duration must be greater then zero").parse(value);
}).transform(Schedule.expression);
var CronExpressionSchema = z.custom((value) => {
  return z.string().refine((cron) => !!cron).parse(value);
}).transform((cron) => Schedule.expression(cron));
var ScheduleExpressionSchema = z.union([RateExpressionSchema, CronExpressionSchema]);

// src/plugins/cron.ts
import { Rule } from "aws-cdk-lib/aws-events";

// src/util/resource.ts
import { Arn } from "aws-cdk-lib";
import { constantCase, paramCase, pascalCase } from "change-case";
var toId = (resource, id) => {
  return pascalCase(`${resource}-${id}`);
};
var toName = (stack, id) => {
  return paramCase(`${stack.stackName}-${id}`);
};
var toEnvKey = (resource, id) => {
  return constantCase(`RESOURCE_${resource}_${id}`);
};
var toArn = (stack, service, resource, id) => {
  return Arn.format({
    service,
    resource,
    resourceName: toName(stack, id)
  }, stack);
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
  return z2.string().regex(/[0-9]+ (seconds?|minutes?|hours?|days?)/, "Invalid duration").parse(value);
}).transform(toDuration);

// src/schema/local-file.ts
import { z as z3 } from "zod";
var LocalFileSchema = z3.string().refine(async () => {
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
  return z7.string().regex(/[0-9]+ (KB|MB|GB)/, "Invalid size").parse(value);
}).transform(toSize);

// src/plugins/function/util/build-worker.ts
import { Worker } from "worker_threads";
var cjs = typeof __require !== "undefined";
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
    const worker = new Worker(workerCode, { workerData: file, eval: true });
    const cleanUp = () => {
      worker.removeAllListeners();
      worker.terminate();
    };
    worker.on("message", (data) => {
      resolve(JSON.parse(data.toString("utf8")));
      cleanUp();
    });
    worker.on("error", (data) => {
      reject(data);
      cleanUp();
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker exited with code ${code}`));
        cleanUp();
      }
    });
  });
};

// src/plugins/function/util/build.ts
import JSZip from "jszip";
import { basename, join as join2 } from "path";
import { mkdir, writeFile } from "fs/promises";
import { filesize } from "filesize";
var zipFiles = (files) => {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.code, {
      compression: "DEFLATE",
      compressionOptions: {
        level: 9
      }
    });
  }
  return zip.generateAsync({
    type: "nodebuffer"
  });
};
var writeBuildHash = async (config2, stack, id, hash) => {
  const funcPath = join2(functionDir, config2.name, stack.artifactId, id);
  const versionFile = join2(funcPath, "HASH");
  await writeFile(versionFile, hash);
};
var writeBuildFiles = async (config2, stack, id, files) => {
  const bundle = await zipFiles(files);
  const funcPath = join2(functionDir, config2.name, stack.artifactId, id);
  const filesPath = join2(funcPath, "files");
  const bundleFile = join2(funcPath, "bundle.zip");
  debug("Bundle size of", style.info(join2(config2.name, stack.artifactId, id)), "is", style.attr(filesize(bundle.byteLength)));
  await mkdir(filesPath, { recursive: true });
  await writeFile(bundleFile, bundle);
  await Promise.all(files.map(async (file) => {
    const fileName = join2(filesPath, file.name);
    await mkdir(basename(fileName), { recursive: true });
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
import { CfnOutput, RemovalPolicy, Stack as Stack3 } from "aws-cdk-lib";
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
var assetBucketName = (config2) => {
  return `awsless-bootstrap-${config2.account}-${config2.region}`;
};
var assetBucketUrl = (config2, stackName) => {
  const bucket = assetBucketName(config2);
  return `https://s3-${config2.region}.amazonaws.com/${bucket}/${stackName}/cloudformation.json`;
};
var version = "2";
var bootstrapStack = (config2, app) => {
  const stack = new Stack3(app, "bootstrap", {
    stackName: `awsless-bootstrap`
  });
  new Bucket(stack, "assets", {
    bucketName: assetBucketName(config2),
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
var publishFunctionAsset = async (config2, stack, id) => {
  const bucket = assetBucketName(config2);
  const key = `${config2.name}/${stack.artifactId}/function/${id}.zip`;
  const funcPath = join3(functionDir, config2.name, stack.artifactId, id);
  const bundleFile = join3(funcPath, "bundle.zip");
  const hashFile = join3(funcPath, "HASH");
  const hash = await readFile(hashFile, "utf8");
  const file = await readFile(bundleFile, "utf8");
  const client = new S3Client({
    credentials: config2.credentials,
    region: config2.region
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

// src/plugins/function/index.ts
import { filesize as filesize2 } from "filesize";
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
var toFunction = ({ config: config2, stack, stackConfig, assets }, id, fileOrProps) => {
  const props = typeof fileOrProps === "string" ? { ...config2.defaults?.function, file: fileOrProps } : { ...config2.defaults?.function, ...fileOrProps };
  const lambda = new Function(stack, toId("function", id), {
    functionName: toName(stack, id),
    handler: "index.default",
    code: Code.fromInline("export default () => {}"),
    ...props,
    memorySize: props.memorySize.toMebibytes()
  });
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
        fileSize: style.attr(filesize2(bundle.size))
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
  lambda.addEnvironment("APP", config2.name, { removeInEdge: true });
  lambda.addEnvironment("STAGE", config2.stage, { removeInEdge: true });
  lambda.addEnvironment("STACK", stackConfig.name, { removeInEdge: true });
  return lambda;
};

// src/plugins/cron.ts
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
        fifo: z11.boolean().default(false),
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
          fifo: z11.boolean().optional(),
          retentionPeriod: DurationSchema.optional(),
          visibilityTimeout: DurationSchema.optional(),
          deliveryDelay: DurationSchema.optional(),
          receiveMessageWaitTime: DurationSchema.optional(),
          maxMessageSize: SizeSchema.optional()
        })
      ])).optional()
    }).array()
  }),
  onStack(context) {
    const { stack, config: config2 } = context;
    return Object.entries(context.stackConfig.queues || {}).map(([id, functionOrProps]) => {
      const props = typeof functionOrProps === "string" ? { ...config2.defaults.queue, consumer: functionOrProps } : { ...config2.defaults.queue, ...functionOrProps };
      const queue2 = new Queue(stack, toId("queue", id), {
        queueName: toName(stack, id),
        ...props,
        maxMessageSizeBytes: props.maxMessageSize.toBytes()
      });
      const lambda = toFunction(context, id, props.consumer);
      lambda.addEventSource(new SqsEventSource(queue2));
      context.bind((lambda2) => {
        queue2.grantSendMessages(lambda2);
        addResourceEnvironment(stack, "queue", id, lambda2);
      });
      return lambda;
    });
  }
});

// src/plugins/table.ts
import { z as z12 } from "zod";
import { AttributeType, BillingMode, ProjectionType, Table, TableClass } from "aws-cdk-lib/aws-dynamodb";
var types = {
  string: AttributeType.STRING,
  number: AttributeType.NUMBER,
  binary: AttributeType.BINARY
};
var tablePlugin = definePlugin({
  name: "table",
  schema: z12.object({
    // defaults: z.object({
    // 	table: z.object({
    // 	}).default({}),
    // }).default({}),
    stacks: z12.object({
      tables: z12.record(
        ResourceIdSchema,
        z12.object({
          hash: z12.string(),
          sort: z12.string().optional(),
          fields: z12.record(z12.string(), z12.enum(["string", "number", "binary"])),
          pointInTimeRecovery: z12.boolean().default(false),
          timeToLiveAttribute: z12.string().optional(),
          indexes: z12.record(z12.string(), z12.object({
            hash: z12.string(),
            sort: z12.string().optional()
            // projection: z.enum(['ALL', 'KEYS_ONLY']),
          })).optional()
        }).refine((props) => props.fields.hasOwnProperty(props.hash), "Hash key must be defined inside the table fields").refine((props) => !props.sort || props.fields.hasOwnProperty(props.sort), "Sort key must be defined inside the table fields")
      ).optional()
    }).array()
  }),
  onStack({ stack, stackConfig, bind }) {
    Object.entries(stackConfig.tables || {}).map(([id, props]) => {
      const buildKey = (attr) => {
        return { name: attr, type: types[props.fields[attr]] };
      };
      const table = new Table(stack, toId("table", id), {
        tableName: toName(stack, id),
        partitionKey: buildKey(props.hash),
        sortKey: props.sort ? buildKey(props.sort) : void 0,
        billingMode: BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: props.pointInTimeRecovery,
        timeToLiveAttribute: props.timeToLiveAttribute,
        tableClass: TableClass.STANDARD
      });
      Object.entries(props.indexes || {}).forEach(([indexName, entry]) => {
        table.addGlobalSecondaryIndex({
          indexName,
          partitionKey: buildKey(entry.hash),
          sortKey: entry.sort ? buildKey(entry.sort) : void 0,
          projectionType: ProjectionType.ALL
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
import { z as z13 } from "zod";
import { Bucket as Bucket2, BucketAccessControl as BucketAccessControl2 } from "aws-cdk-lib/aws-s3";
var storePlugin = definePlugin({
  name: "store",
  schema: z13.object({
    stacks: z13.object({
      stores: z13.array(ResourceIdSchema).optional()
    }).array()
  }),
  onStack({ stack, stackConfig, bind }) {
    (stackConfig.stores || []).forEach((id) => {
      const bucket = new Bucket2(stack, toId("store", id), {
        bucketName: toName(stack, id),
        accessControl: BucketAccessControl2.PRIVATE
      });
      bind((lambda) => {
        bucket.grantReadWrite(lambda), addResourceEnvironment(stack, "store", id, lambda);
      });
    });
  }
});

// src/plugins/topic.ts
import { z as z14 } from "zod";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
var topicPlugin = definePlugin({
  name: "topic",
  schema: z14.object({
    stacks: z14.object({
      topics: z14.record(ResourceIdSchema, FunctionSchema).optional()
    }).array()
  }),
  onBootstrap({ config: config2, stack }) {
    const allTopicNames = config2.stacks.map((stack2) => {
      return Object.keys(stack2.topics || {});
    }).flat();
    const uniqueTopicNames = [...new Set(allTopicNames)];
    uniqueTopicNames.forEach((id) => {
      new Topic(stack, toId("topic", id), {
        topicName: id,
        displayName: id
      });
    });
  },
  onStack(ctx) {
    return Object.entries(ctx.stackConfig.topics || {}).map(([id, props]) => {
      const lambda = toFunction(ctx, id, props);
      const topic = Topic.fromTopicArn(
        ctx.stack,
        toId("topic", id),
        toArn(ctx.stack, "sns", "topic", id)
      );
      lambda.addEventSource(new SnsEventSource(topic));
      return lambda;
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
  topicPlugin
];

// src/stack/app-bootstrap.ts
var appBootstrapStack = ({ config: config2, app, assets }) => {
  const stack = new Stack4(app, "bootstrap", {
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

// src/app.ts
var makeApp = (config2) => {
  return new App4({
    outdir: assemblyDir,
    defaultStackSynthesizer: new DefaultStackSynthesizer({
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
    dependencyTree = createDependencyTree(stacks);
  } else {
    dependencyTree = [{
      stack: bootstrap2,
      level: 0,
      children: createDependencyTree(stacks)
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
      time.set(style.attr(diff) + style.attr.dim("ms"));
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
import { join as join4 } from "path";

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

// src/config.ts
import { load } from "ts-import";

// src/schema/app.ts
import { z as z18 } from "zod";

// src/schema/stack.ts
import { z as z15 } from "zod";
var StackSchema = z15.object({
  name: ResourceIdSchema,
  depends: z15.array(z15.lazy(() => StackSchema)).optional()
});

// src/schema/region.ts
import { z as z16 } from "zod";
var US = ["us-east-2", "us-east-1", "us-west-1", "us-west-2"];
var AF = ["af-south-1"];
var AP = ["ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1"];
var CA = ["ca-central-1"];
var EU = ["eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2"];
var ME = ["me-south-1", "me-central-1"];
var SA = ["sa-east-1"];
var regions = [...US, ...AF, ...AP, ...CA, ...EU, ...ME, ...SA];
var RegionSchema = z16.enum(regions);

// src/schema/plugin.ts
import { z as z17 } from "zod";
var PluginSchema = z17.object({
  name: z17.string(),
  schema: z17.custom().optional(),
  depends: z17.array(z17.lazy(() => PluginSchema)).optional(),
  onBootstrap: z17.function().optional(),
  onStack: z17.function().returns(z17.any()).optional(),
  onApp: z17.function().optional()
  // bind: z.function().optional(),
});

// src/schema/app.ts
var AppSchema = z18.object({
  name: ResourceIdSchema,
  region: RegionSchema,
  profile: z18.string(),
  stage: z18.string().regex(/[a-z]+/).default("prod"),
  defaults: z18.object({}).default({}),
  stacks: z18.array(StackSchema).min(1),
  plugins: z18.array(PluginSchema).optional()
});

// src/config.ts
var importConfig = async (options) => {
  debug("Import config file");
  const fileName = join4(process.cwd(), options.configFile || "awsless.config.ts");
  const module = await load(fileName);
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
      const { app, assets } = await toApp(config2, filters);
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
          const status2 = new Signal(style.info("building"));
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
            details,
            time,
            " ]",
            br()
          ]);
          group.update((group2) => [...group2, line]);
          const data = await asset.build?.();
          const diff = (/* @__PURE__ */ new Date()).getTime() - start.getTime();
          time.set(" / " + style.attr(diff) + style.attr.dim("ms"));
          if (data) {
            details.set(Object.entries(data).map(([key, value]) => {
              return ` / ${style.label(key)}: ${style.info(value)}`;
            }).join(" / "));
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
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand, GetTemplateCommand, OnFailure, TemplateStage, UpdateStackCommand, ValidateTemplateCommand, waitUntilStackCreateComplete, waitUntilStackDeleteComplete, waitUntilStackUpdateComplete } from "@aws-sdk/client-cloudformation";
import { S3Client as S3Client2, PutObjectCommand as PutObjectCommand2, ObjectCannedACL as ObjectCannedACL2, StorageClass as StorageClass2 } from "@aws-sdk/client-s3";
var StackClient = class {
  // 30 seconds
  constructor(config2) {
    this.config = config2;
    this.client = new CloudFormationClient({
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
          style.placeholder(" [ "),
          status2,
          style.placeholder(" ] "),
          br()
        ]);
        term.out.write(line);
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
      const { app, stackNames, assets, dependencyTree } = await toApp(config2, filters);
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

// src/cli/command/test.ts
var test = (program2) => {
  program2.command("test").description("Test").action(async () => {
    await layout(async (config2, write) => {
    });
  });
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
  // diff,
  // remove,
  config,
  test
];
commands2.forEach((command) => command(program));

// src/bin.ts
program.parse(process.argv);
