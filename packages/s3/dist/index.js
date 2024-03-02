// src/mock.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
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
  const s3ClientMock = mockClient(S3Client);
  s3ClientMock.on(PutObjectCommand).callsFake(async (input) => {
    await nextTick(fn);
    const sha1 = await hashSHA1(input.Body);
    store[input.Key] = {
      body: input.Body,
      sha1
    };
    return {
      ChecksumSHA1: sha1
    };
  });
  s3ClientMock.on(GetObjectCommand).callsFake(async (input) => {
    await nextTick(fn);
    const data = store[input.Key];
    if (data) {
      const stream = new Readable2();
      stream.push(data.body);
      stream.push(null);
      return {
        ChecksumSHA1: data.sha1,
        Body: sdkStreamMixin(stream)
      };
    }
    return;
  });
  s3ClientMock.on(DeleteObjectCommand).callsFake(async (input) => {
    await nextTick(fn);
    delete store[input.Key];
    return {};
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};

// src/client.ts
import { S3Client as S3Client2 } from "@aws-sdk/client-s3";
import { globalClient } from "@awsless/utils";
var s3Client = globalClient(() => {
  return new S3Client2({});
});

// src/commands.ts
import { DeleteObjectCommand as DeleteObjectCommand2, GetObjectCommand as GetObjectCommand2, PutObjectCommand as PutObjectCommand2 } from "@aws-sdk/client-s3";
var putObject = async ({
  client = s3Client(),
  bucket,
  key,
  body,
  metadata,
  storageClass = "STANDARD"
}) => {
  const command = new PutObjectCommand2({
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
  const command = new GetObjectCommand2({
    Bucket: bucket,
    Key: key
  });
  const result = await client.send(command);
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
  const command = new DeleteObjectCommand2({
    Bucket: bucket,
    Key: key
  });
  await client.send(command);
};
export {
  deleteObject,
  getObject,
  mockS3,
  putObject,
  s3Client
};
