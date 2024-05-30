import { S3Client, StorageClass } from '@aws-sdk/client-s3';
export { S3Client, StorageClass } from '@aws-sdk/client-s3';
import * as _smithy_types from '@smithy/types';
import { PresignedPost } from '@aws-sdk/s3-presigned-post';
import { Duration } from '@awsless/duration';
import { Size } from '@awsless/size';
import { SdkStream } from '@aws-sdk/types';
import { Readable } from 'stream';
import { Mock } from 'vitest';

declare const s3Client: {
    (): S3Client;
    set(client: S3Client): void;
};

type Body = string | Readable | ReadableStream | Blob | Uint8Array | Buffer | undefined;
type BodyStream = SdkStream<Readable | Blob | ReadableStream<any> | undefined>;

type PutObjectProps = {
    client?: S3Client;
    bucket: string;
    key: string;
    body: Body;
    metadata?: Record<string, string>;
    storageClass?: StorageClass;
};
declare const putObject: ({ client, bucket, key, body, metadata, storageClass, }: PutObjectProps) => Promise<{
    sha1: string;
}>;
type GetObjectProps = {
    client?: S3Client;
    bucket: string;
    key: string;
};
declare const getObject: ({ client, bucket, key }: GetObjectProps) => Promise<{
    metadata: Record<string, string>;
    sha1: string;
    body: _smithy_types.StreamingBlobPayloadOutputTypes;
} | undefined>;
type HeadObjectProps = {
    client?: S3Client;
    bucket: string;
    key: string;
};
declare const headObject: ({ client, bucket, key }: HeadObjectProps) => Promise<{
    metadata: Record<string, string>;
    sha1: string;
} | undefined>;
type DeleteObjectProps = {
    client?: S3Client;
    bucket: string;
    key: string;
};
declare const deleteObject: ({ client, bucket, key }: DeleteObjectProps) => Promise<void>;
type CopyObjectProps = {
    client?: S3Client;
    bucket: string;
    source: string;
    key: string;
    versionId?: string;
};
declare const copyObject: ({ client, bucket, source, key, versionId }: CopyObjectProps) => Promise<void>;
type CreatePresignedPostProps = {
    client?: S3Client;
    bucket: string;
    key: string;
    fields?: Record<string, string>;
    expires?: Duration;
    contentLengthRange?: [Size, Size];
};
declare const createPresignedPost: ({ client, bucket, key, fields, expires, contentLengthRange, }: CreatePresignedPostProps) => Promise<PresignedPost>;

declare const mockS3: () => Mock<any, any>;

export { Body, BodyStream, CopyObjectProps, CreatePresignedPostProps, DeleteObjectProps, GetObjectProps, HeadObjectProps, PutObjectProps, copyObject, createPresignedPost, deleteObject, getObject, headObject, mockS3, putObject, s3Client };
