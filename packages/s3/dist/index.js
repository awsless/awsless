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
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
var getObject = async ({ client = s3Client(), bucket, key, versionId }) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    VersionId: versionId
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
var headObject = async ({ client = s3Client(), bucket, key, versionId }) => {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
    VersionId: versionId
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
  if (!result) {
    return;
  }
  return {
    metadata: result.Metadata ?? {},
    sha1: result.ChecksumSHA1
  };
};
var deleteObject = async ({ client = s3Client(), bucket, key }) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });
  await client.send(command);
};
var copyObject = async ({ client = s3Client(), source, destination }) => {
  if (source.versionId) {
    source.key = `${source.key}?versionId=${source.versionId}`;
  }
  const command = new CopyObjectCommand({
    Bucket: destination.bucket,
    CopySource: `/${source.bucket}/${source.key}`,
    Key: destination.key
  });
  await client.send(command);
};
var signedUploadUrlMock;
var setSignedUploadUrlMock = (m) => {
  signedUploadUrlMock = m;
};
var createSignedUploadUrl = async ({
  client = s3Client(),
  bucket,
  key,
  fields,
  /** Duration before the presigned post expires. */
  expires,
  contentLengthRange
}) => {
  if (signedUploadUrlMock) {
    return signedUploadUrlMock;
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
var signedDownloadUrlMock;
var setSignedDownloadUrlMock = (url) => {
  signedDownloadUrlMock = url;
};
var createSignedDownloadUrl = async ({
  client = s3Client(),
  bucket,
  key,
  versionId,
  expires
}) => {
  if (signedDownloadUrlMock) {
    return signedDownloadUrlMock;
  }
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    VersionId: versionId
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: expires ? Number(toSeconds(expires)) : void 0
  });
  return url;
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
var MemoryStore = class {
  store = {};
  bucket(name) {
    if (!this.store[name]) {
      this.store[name] = {};
    }
    return this.store[name];
  }
  get(bucket, key) {
    return this.bucket(bucket)[key];
  }
  put(bucket, key, object) {
    this.bucket(bucket)[key] = object;
    return this;
  }
  del(bucket, key) {
    delete this.bucket(bucket)[key];
    return this;
  }
};
var mockS3 = () => {
  const fn = vi.fn();
  const store = new MemoryStore();
  const s3ClientMock = mockClient(S3Client3);
  s3ClientMock.on(PutObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const sha1 = await hashSHA1(input.Body);
    store.put(input.Bucket, input.Key, {
      body: input.Body,
      sha1,
      meta: input.Metadata ?? {}
    });
    return {
      ChecksumSHA1: sha1
    };
  });
  s3ClientMock.on(GetObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const data = store.get(input.Bucket, input.Key);
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
      message: "No such key"
    });
  });
  s3ClientMock.on(HeadObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const data = store.get(input.Bucket, input.Key);
    if (data) {
      return {
        Metadata: data.meta,
        ChecksumSHA1: data.sha1
      };
    }
    throw new NoSuchKey2({
      $metadata: {},
      message: "No such key"
    });
  });
  s3ClientMock.on(CopyObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    const [_, SourceBucket, ...Path] = input.CopySource.split("/");
    const SourceKey = Path.join("/");
    const data = store.get(SourceBucket, SourceKey);
    if (data) {
      store.put(input.Bucket, input.Key, data);
    }
    return;
  });
  s3ClientMock.on(DeleteObjectCommand2).callsFake(async (input) => {
    await nextTick(fn);
    store.del(input.Bucket, input.Key);
    return {};
  });
  setSignedDownloadUrlMock("http://s3-download-url.com");
  setSignedUploadUrlMock({
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
  createSignedDownloadUrl,
  createSignedUploadUrl,
  deleteObject,
  getObject,
  headObject,
  mockS3,
  putObject,
  s3Client
};
