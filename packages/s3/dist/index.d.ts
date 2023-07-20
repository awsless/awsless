import { Mock } from 'vitest';
import * as _aws_sdk_client_s3 from '@aws-sdk/client-s3';
import { S3Client, StorageClass } from '@aws-sdk/client-s3';
import * as _aws_sdk_types from '@aws-sdk/types';
import * as stream from 'stream';
import { Readable } from 'stream';

declare const mockS3: () => Mock<any, any>;

declare const s3Client: {
    (): S3Client;
    set(client: S3Client): void;
};

type PutObject = {
    client?: S3Client;
    bucket: string;
    name: string;
    body: Readable | ReadableStream | Blob;
    metaData?: Record<string, string>;
    storageClass?: StorageClass;
};
type GetObject = Pick<PutObject, 'client' | 'bucket' | 'name'>;
type DeleteObject = Pick<PutObject, 'client' | 'bucket' | 'name'>;

declare const putObject: ({ client, bucket, name, body, metaData, storageClass, }: PutObject) => Promise<_aws_sdk_client_s3.PutObjectCommandOutput>;
declare const getObject: ({ client, bucket, name }: GetObject) => Promise<{
    body: _aws_sdk_types.SdkStream<stream.Readable | ReadableStream | Blob | undefined> | undefined;
}>;
declare const deleteObject: ({ client, bucket, name }: DeleteObject) => Promise<_aws_sdk_client_s3.DeleteObjectCommandOutput>;

export { deleteObject, getObject, mockS3, putObject, s3Client };
