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
  copyObject: () => copyObject,
  createPresignedPost: () => createPresignedPost,
  deleteObject: () => deleteObject,
  getObject: () => getObject,
  headObject: () => headObject,
  mockS3: () => mockS3,
  putObject: () => putObject,
  s3Client: () => s3Client
});
module.exports = __toCommonJS(src_exports);

// src/client.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_utils = require("@awsless/utils");
var s3Client = (0, import_utils.globalClient)(() => {
  return new import_client_s3.S3Client({});
});

// src/commands.ts
var import_client_s32 = require("@aws-sdk/client-s3");
var import_s3_presigned_post = require("@aws-sdk/s3-presigned-post");
var import_duration = require("@awsless/duration");
var import_size = require("@awsless/size");
var putObject = async ({
  client = s3Client(),
  bucket,
  key,
  body,
  metadata,
  storageClass = "STANDARD"
}) => {
  const command = new import_client_s32.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    Metadata: metadata,
    StorageClass: storageClass,
    ChecksumAlgorithm: "SHA1"
  });
  const result = await client.send(command);
  return {
    sha1: result.ChecksumSHA1
  };
};
var getObject = async ({ client = s3Client(), bucket, key }) => {
  const command = new import_client_s32.GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  let result;
  try {
    result = await client.send(command);
  } catch (error) {
    if (error instanceof import_client_s32.NoSuchKey) {
      return;
    }
    throw error;
  }
  if (!result || !result.Body) {
    return;
  }
  return {
    metadata: result.Metadata ?? {},
    sha1: result.ChecksumSHA1,
    body: result.Body
  };
};
var headObject = async ({ client = s3Client(), bucket, key }) => {
  const command = new import_client_s32.HeadObjectCommand({
    Bucket: bucket,
    Key: key
  });
  let result;
  try {
    result = await client.send(command);
  } catch (error) {
    if (error instanceof import_client_s32.NoSuchKey) {
      return;
    }
    throw error;
  }
  if (!result) {
    return;
  }
  return {
    metadata: result.Metadata ?? {},
    sha1: result.ChecksumSHA1
  };
};
var deleteObject = async ({ client = s3Client(), bucket, key }) => {
  const command = new import_client_s32.DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });
  await client.send(command);
};
var copyObject = async ({ client = s3Client(), source, destination }) => {
  if (source.versionId) {
    source.key = `${source.key}?versionId=${source.versionId}`;
  }
  const command = new import_client_s32.CopyObjectCommand({
    Bucket: destination.bucket,
    CopySource: `/${source.bucket}/${source.key}`,
    Key: destination.key
  });
  await client.send(command);
};
var mock;
var setPresignedMock = (m) => {
  mock = m;
};
var createPresignedPost = async ({
  client = s3Client(),
  bucket,
  key,
  fields,
  /** Duration before the presigned post expires. */
  expires,
  contentLengthRange
}) => {
  if (mock) {
    return mock;
  }
  const result = await (0, import_s3_presigned_post.createPresignedPost)(client, {
    Bucket: bucket,
    Key: key,
    Fields: fields,
    Expires: expires ? Number((0, import_duration.toSeconds)(expires)) : void 0,
    Conditions: contentLengthRange ? [["content-length-range", Number((0, import_size.toBytes)(contentLengthRange[0])), Number((0, import_size.toBytes)(contentLengthRange[1]))]] : void 0
  });
  return result;
};

// src/mock.ts
var import_client_s33 = require("@aws-sdk/client-s3");
var import_util_stream_node = require("@aws-sdk/util-stream-node");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var import_stream2 = require("stream");

// src/hash.ts
var import_crypto = require("crypto");
var import_stream = require("stream");
var hashSHA1 = async (data) => {
  if (!data) {
    return "";
  }
  if (typeof data === "string") {
    data = Buffer.from(data);
  }
  if (data instanceof Blob) {
    const arrayBuffer = await data.arrayBuffer();
    data = Buffer.from(arrayBuffer);
  }
  if (data instanceof import_stream.Readable) {
    return "";
  }
  if (data instanceof ReadableStream) {
    return "";
  }
  return (0, import_crypto.createHash)("sha1").update(data).digest("hex");
};

// src/mock.ts
var mockS3 = () => {
  const fn = vi.fn();
  const store = {};
  const s3ClientMock = (0, import_aws_sdk_client_mock.mockClient)(import_client_s33.S3Client);
  s3ClientMock.on(import_client_s33.PutObjectCommand).callsFake(async (input) => {
    await (0, import_utils2.nextTick)(fn);
    const sha1 = await hashSHA1(input.Body);
    store[input.Key] = {
      body: input.Body,
      sha1,
      meta: input.Metadata ?? {}
    };
    return {
      ChecksumSHA1: sha1
    };
  });
  s3ClientMock.on(import_client_s33.GetObjectCommand).callsFake(async (input) => {
    await (0, import_utils2.nextTick)(fn);
    const data = store[input.Key];
    if (data) {
      const stream = new import_stream2.Readable();
      stream.push(data.body);
      stream.push(null);
      return {
        Metadata: data.meta,
        ChecksumSHA1: data.sha1,
        Body: (0, import_util_stream_node.sdkStreamMixin)(stream)
      };
    }
    throw new import_client_s33.NoSuchKey({
      $metadata: {},
      message: "No such key"
    });
  });
  s3ClientMock.on(import_client_s33.HeadObjectCommand).callsFake(async (input) => {
    await (0, import_utils2.nextTick)(fn);
    const data = store[input.Key];
    if (data) {
      return {
        Metadata: data.meta,
        ChecksumSHA1: data.sha1
      };
    }
    throw new import_client_s33.NoSuchKey({
      $metadata: {},
      message: "No such key"
    });
  });
  s3ClientMock.on(import_client_s33.CopyObjectCommand).callsFake(async (input) => {
    await (0, import_utils2.nextTick)(fn);
    const data = store[input.CopySource];
    if (data) {
      store[input.Key] = data;
    }
    return;
  });
  s3ClientMock.on(import_client_s33.DeleteObjectCommand).callsFake(async (input) => {
    await (0, import_utils2.nextTick)(fn);
    delete store[input.Key];
    return {};
  });
  setPresignedMock({
    url: "http://s3-upload-url.com",
    fields: {}
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  copyObject,
  createPresignedPost,
  deleteObject,
  getObject,
  headObject,
  mockS3,
  putObject,
  s3Client
});
