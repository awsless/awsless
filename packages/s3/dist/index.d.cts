import { Mock } from 'vitest';
import { S3Client, StorageClass } from '@aws-sdk/client-s3';
export { S3Client, StorageClass } from '@aws-sdk/client-s3';
import * as _aws_sdk_types from '@aws-sdk/types';
import { SdkStream } from '@aws-sdk/types';
import * as stream from 'stream';
import { Readable } from 'stream';

declare const mockS3: () => Mock<any, any>;

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
type GetObjectProps = Pick<PutObjectProps, 'client' | 'bucket' | 'key'>;
type DeleteObjectProps = Pick<PutObjectProps, 'client' | 'bucket' | 'key'>;

declare const putObject: ({ client, bucket, key, body, metadata, storageClass, }: PutObjectProps) => Promise<{
    sha1: string;
}>;
declare const getObject: ({ client, bucket, key }: GetObjectProps) => Promise<{
    metadata: Record<string, string>;
    sha1: string;
    body: _aws_sdk_types.SdkStream<stream.Readable | Blob | ReadableStream<any> | undefined>;
} | undefined>;
declare const deleteObject: ({ client, bucket, key }: DeleteObjectProps) => Promise<void>;

export { Body, BodyStream, DeleteObjectProps, GetObjectProps, PutObjectProps, deleteObject, getObject, mockS3, putObject, s3Client };
