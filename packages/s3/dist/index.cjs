"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  deleteObject: () => deleteObject,
  getObject: () => getObject,
  mockS3: () => mockS3,
  putObject: () => putObject,
  s3Client: () => s3Client
});
module.exports = __toCommonJS(src_exports);

// src/mock.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_utils = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockS3 = () => {
  const fn = vi.fn();
  const cache = {};
  const s3ClientMock = (0, import_aws_sdk_client_mock.mockClient)(import_client_s3.S3Client);
  s3ClientMock.on(import_client_s3.PutObjectCommand).callsFake(async (input) => {
    await (0, import_utils.nextTick)(fn);
    cache[input.Key] = input.Body;
    return {};
  });
  s3ClientMock.on(import_client_s3.GetObjectCommand).callsFake(async (input) => {
    await (0, import_utils.nextTick)(fn);
    return { Body: cache[input.Key] };
  });
  s3ClientMock.on(import_client_s3.DeleteObjectCommand).callsFake(async (input) => {
    await (0, import_utils.nextTick)(fn);
    delete cache[input.Key];
    return {};
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};

// src/client.ts
var import_client_s32 = require("@aws-sdk/client-s3");
var import_utils2 = require("@awsless/utils");
var s3Client = (0, import_utils2.globalClient)(() => {
  return new import_client_s32.S3Client({});
});

// src/commands.ts
var import_client_s33 = require("@aws-sdk/client-s3");
var putObject = ({
  client = s3Client(),
  bucket,
  name,
  body,
  metaData,
  storageClass = "STANDARD_IA"
}) => {
  const command = new import_client_s33.PutObjectCommand({
    Bucket: bucket,
    Key: name,
    Body: body,
    Metadata: metaData,
    StorageClass: storageClass
  });
  return client.send(command);
};
var getObject = async ({ client = s3Client(), bucket, name }) => {
  const command = new import_client_s33.GetObjectCommand({
    Bucket: bucket,
    Key: name
  });
  const result = await client.send(command);
  return {
    body: result.Body
  };
};
var deleteObject = ({ client = s3Client(), bucket, name }) => {
  const command = new import_client_s33.DeleteObjectCommand({
    Bucket: bucket,
    Key: name
  });
  return client.send(command);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deleteObject,
  getObject,
  mockS3,
  putObject,
  s3Client
});
