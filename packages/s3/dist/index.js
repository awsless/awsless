// src/mock.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
var mockS3 = () => {
  const fn = vi.fn();
  const cache = {};
  const s3ClientMock = mockClient(S3Client);
  s3ClientMock.on(PutObjectCommand).callsFake(async (input) => {
    await nextTick(fn);
    cache[input.Key] = input.Body;
    return {};
  });
  s3ClientMock.on(GetObjectCommand).callsFake(async (input) => {
    await nextTick(fn);
    return { Body: cache[input.Key] };
  });
  s3ClientMock.on(DeleteObjectCommand).callsFake(async (input) => {
    await nextTick(fn);
    delete cache[input.Key];
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
var putObject = ({
  client = s3Client(),
  bucket,
  name,
  body,
  metaData,
  storageClass = "STANDARD_IA"
}) => {
  const command = new PutObjectCommand2({
    Bucket: bucket,
    Key: name,
    Body: body,
    Metadata: metaData,
    StorageClass: storageClass
  });
  return client.send(command);
};
var getObject = ({ client = s3Client(), bucket, name }) => {
  const command = new GetObjectCommand2({
    Bucket: bucket,
    Key: name
  });
  return client.send(command);
};
var deleteObject = ({ client = s3Client(), bucket, name }) => {
  const command = new DeleteObjectCommand2({
    Bucket: bucket,
    Key: name
  });
  return client.send(command);
};
export {
  deleteObject,
  getObject,
  mockS3,
  putObject,
  s3Client
};
