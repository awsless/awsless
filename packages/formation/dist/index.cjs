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
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var import_automation = require("@pulumi/pulumi/automation");
var aws = __toESM(require("@pulumi/aws"), 1);
var pulumiProgram = () => __async(void 0, null, function* () {
  const table = new aws.dynamodb.Table("table", {
    name: "test-table",
    hashKey: "key"
    // attributes: {
    // 	key: 'S',
    // },
  });
  return {
    arn: table.arn
  };
});
var args = {
  stackName: "test-stack",
  projectName: "test-app",
  program: pulumiProgram
};
var getStack = () => __async(void 0, null, function* () {
  console.info("--- 2");
  const stack = yield import_automation.LocalWorkspace.createStack(args, {
    projectSettings: {
      name: args.projectName,
      runtime: "nodejs",
      backend: {
        url: "s3://pulumi-test-aws"
      }
    }
  });
  yield stack.workspace.installPlugin("aws", "v4.0.0");
  console.info("successfully initialized stack");
  console.info("installing plugins...");
  yield stack.workspace.installPlugin("aws", "v4.0.0");
  console.info("plugins installed");
  console.info("setting up config");
  yield stack.setConfig("aws:region", {
    value: aws.Region.EUWest1
  });
  console.info("config set");
  console.info("refreshing stack...");
  yield stack.up({
    onOutput: console.info
  });
  console.info("refresh complete");
  return stack;
});
var main = () => __async(void 0, null, function* () {
  const stack = yield getStack();
  console.info("updating stack...");
  const upRes = yield stack.up({
    onOutput: console.info
  });
  console.log(`update summary: 
${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`);
  console.log(`db host url: ${upRes.outputs.host.value}`);
  console.info("configuring db...");
});
main();
