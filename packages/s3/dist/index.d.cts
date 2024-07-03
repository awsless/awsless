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
    versionId?: string;
};
declare const getObject: ({ client, bucket, key, versionId }: GetObjectProps) => Promise<{
    metadata: Record<string, string>;
    sha1: string;
    body: _smithy_types.StreamingBlobPayloadOutputTypes;
} | undefined>;
type HeadObjectProps = {
    client?: S3Client;
    bucket: string;
    key: string;
    versionId?: string;
};
declare const headObject: ({ client, bucket, key, versionId }: HeadObjectProps) => Promise<{
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
    client?: S3Client;
    bucket: string;
    key: string;
    fields?: Record<string, string>;
    expires?: Duration;
    contentLengthRange?: [Size, Size];
};
declare const createSignedUploadUrl: ({ client, bucket, key, fields, expires, contentLengthRange, }: CreateSignedUploadUrlProps) => Promise<PresignedPost>;
type CreateSignedDownloadUrlProps = {
    client?: S3Client;
    bucket: string;
    key: string;
    versionId?: string;
    expires?: Duration;
};
declare const createSignedDownloadUrl: ({ client, bucket, key, versionId, expires, }: CreateSignedDownloadUrlProps) => Promise<string>;

declare const mockS3: () => Mock<any, any>;

export { Body, BodyStream, CopyObjectProps, CreateSignedDownloadUrlProps, CreateSignedUploadUrlProps, DeleteObjectProps, GetObjectProps, HeadObjectProps, PutObjectProps, copyObject, createSignedDownloadUrl, createSignedUploadUrl, deleteObject, getObject, headObject, mockS3, putObject, s3Client };
