// src/client.ts
import { S3Client } from "@aws-sdk/client-s3";
import { globalClient } from "@awsless/utils";
var s3Client = globalClient(() => {
  return new S3Client({});
});

// src/commands.ts
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { createPresignedPost as signedPost } from "@aws-sdk/s3-presigned-post";
import { toSeconds } from "@awsless/duration";
import { toBytes } from "@awsless/size";
var putObject = async ({
  client = s3Client(),
  bucket,
  key,
  body,
  metadata,
  storageClass = "STANDARD"
}) => {
  const command = new PutObjectCommand({
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
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  let result;
  try {
    result = await client.send(command);
  } catch (error) {
    if (error instanceof NoSuchKey) {
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
var deleteObject = async ({ client = s3Client(), bucket, key }) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });
  await client.send(command);
};
var copyObject = async ({ client = s3Client(), bucket, source, key, versionId }) => {
  if (versionId) {
    source = `${source}?versionId=${versionId}`;
  }
  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: source,
    Key: key
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
  const result = await signedPost(client, {
    Bucket: bucket,
    Key: key,
    Fields: fields,
    Expires: expires ? Number(toSeconds(expires)) : void 0,
    Conditions: contentLengthRange ? [["content-length-range", Number(toBytes(contentLengthRange[0])), Number(toBytes(contentLengthRange[1]))]] : void 0
  });
  return result;
};

// src/mock.ts
import {
  CopyObjectCommand as CopyObjectCommand2,
  DeleteObjectCommand as DeleteObjectCommand2,
  GetObjectCommand as GetObjectCommand2,
  HeadObjectCommand as HeadObjectCommand2,
  NoSuchKey as NoSuchKey2,
  PutObjectCommand as PutObjectCommand2,
  S3Client as S3Client3
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
import { Readable as Readable2 } from "stream";

// src/hash.ts
import { createHash } from "crypto";
import { Readable } from "stream";
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
  if (data instanceof Readable) {
    return "";
  }
  if (data instanceof ReadableStream) {
    return "";
  }
  return createHash("sha1").update(data).digest("hex");
};

// src/mock.ts
var mockS3 = () => {
  const fn = vi.fn();
  const store = {};
  const s3ClientMock = mockClient(S3Client3);
  s3ClientMock.on(PutObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
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
  s3ClientMock.on(GetObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const data = store[input.Key];
    if (data) {
      const stream = new Readable2();
      stream.push(data.body);
      stream.push(null);
      return {
        Metadata: data.meta,
        ChecksumSHA1: data.sha1,
        Body: sdkStreamMixin(stream)
      };
    }
    throw new NoSuchKey2({
      $metadata: {},
      message: "no such key"
    });
  });
  s3ClientMock.on(HeadObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const data = store[input.Key];
    if (data) {
      return {
        Metadata: data.meta,
        ChecksumSHA1: data.sha1
      };
    }
    throw new NoSuchKey2({
      $metadata: {},
      message: "no such key"
    });
  });
  s3ClientMock.on(CopyObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const data = store[input.CopySource];
    if (data) {
      store[input.Key] = data;
    }
    return;
  });
  s3ClientMock.on(DeleteObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
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
export {
  copyObject,
  createPresignedPost,
  deleteObject,
  getObject,
  mockS3,
  putObject,
  s3Client
};
