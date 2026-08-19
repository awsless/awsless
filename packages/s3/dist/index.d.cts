import { S3Client, S3Client as S3Client$1, StorageClass, StorageClass as StorageClass$1 } from "@aws-sdk/client-s3";
import { PresignedPost } from "@aws-sdk/s3-presigned-post";
import { Duration } from "@awsless/duration";
import { Size } from "@awsless/size";
import { Readable } from "stream";
import { SdkStream } from "@smithy/types";
import { Mock } from "vitest";
//#region src/client.d.ts
declare const s3Client: {
  (): S3Client$1;
  set(client: S3Client$1): void;
};
//#endregion
//#region ../../node_modules/.pnpm/@aws-sdk+types@3.974.4/node_modules/@aws-sdk/types/dist-types/serde.d.ts
/**
 * @public
 *
 * Declare DOM interfaces in case dom.d.ts is not added to the tsconfig lib, causing
 * interfaces to not be defined. For developers with dom.d.ts added, the interfaces will
 * be merged correctly.
 *
 * This is also required for any clients with streaming interfaces where the corresponding
 * types are also referred. The type is only declared here once since this `@aws-sdk/types`
 * is depended by all `@aws-sdk` packages.
 */
declare global {
  /**
   * @public
   */
  export interface ReadableStream {}
  /**
   * @public
   */
  export interface Blob {}
}
//#endregion
//#region src/types.d.ts
type Body = string | Readable | ReadableStream | Blob | Uint8Array | Buffer | undefined;
type BodyStream = SdkStream<Readable | Blob | ReadableStream<any> | undefined>;
//#endregion
//#region src/commands.d.ts
type PutObjectProps = {
  client?: S3Client$1;
  bucket: string;
  key: string;
  body: Body;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  storageClass?: StorageClass$1;
};
declare const putObject: ({ client, bucket, key, body, metadata, contentType, cacheControl, storageClass }: PutObjectProps) => Promise<{
  sha1: string;
}>;
type GetObjectProps = {
  client?: S3Client$1;
  bucket: string;
  key: string;
  versionId?: string;
};
declare const getObject: ({ client, bucket, key, versionId }: GetObjectProps) => Promise<{
  metadata: Record<string, string>;
  sha1: string;
  body: import("@smithy/types").StreamingBlobPayloadOutputTypes;
} | undefined>;
type HeadObjectProps = {
  client?: S3Client$1;
  bucket: string;
  key: string;
  versionId?: string;
};
declare const headObject: ({ client, bucket, key, versionId }: HeadObjectProps) => Promise<{
  metadata: Record<string, string>;
  sha1: string;
} | undefined>;
type DeleteObjectProps = {
  client?: S3Client$1;
  bucket: string;
  key: string;
};
declare const deleteObject: ({ client, bucket, key }: DeleteObjectProps) => Promise<void>;
type CopyObjectProps = {
  client?: S3Client$1;
  source: {
    bucket: string;
    key: string;
    versionId?: string;
  };
  destination: {
    bucket: string;
    key: string;
  };
};
declare const copyObject: ({ client, source, destination }: CopyObjectProps) => Promise<void>;
type CreateSignedUploadUrlProps = {
  client?: S3Client$1;
  bucket: string;
  key: string;
  fields?: Record<string, string>;
  expires?: Duration;
  contentLengthRange?: [Size, Size];
};
declare const createSignedUploadUrl: ({ client, bucket, key, fields, expires, contentLengthRange }: CreateSignedUploadUrlProps) => Promise<PresignedPost>;
type CreateSignedDownloadUrlProps = {
  client?: S3Client$1;
  bucket: string;
  key: string;
  versionId?: string;
  expires?: Duration;
};
declare const createSignedDownloadUrl: ({ client, bucket, key, versionId, expires }: CreateSignedDownloadUrlProps) => Promise<string>;
//#endregion
//#region src/mock.d.ts
declare const mockS3: () => Mock;
//#endregion
export { type Body, type BodyStream, type CopyObjectProps, type CreateSignedDownloadUrlProps, type CreateSignedUploadUrlProps, type DeleteObjectProps, type GetObjectProps, type HeadObjectProps, type PutObjectProps, S3Client, StorageClass, copyObject, createSignedDownloadUrl, createSignedUploadUrl, deleteObject, getObject, headObject, mockS3, putObject, s3Client };