'use strict';

var clientS3 = require('@aws-sdk/client-s3');

const send = async (event, id, status, data, reason = '')=>{
    const body = JSON.stringify({
        Status: status,
        Reason: reason,
        PhysicalResourceId: id,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        NoEcho: false,
        Data: data
    });
    await fetch(event.ResponseURL, {
        method: 'PUT',
        // @ts-ignore
        port: 443,
        body,
        headers: {
            'content-type': '',
            'content-length': Buffer.from(body).byteLength.toString()
        }
    });
};

const client = new clientS3.S3Client({});
const handler = async (event)=>{
    const type = event.RequestType;
    const bucketName = event.ResourceProperties.bucketName;
    console.log('Type:', type);
    console.log('BucketName:', bucketName);
    try {
        if (type === 'Delete') {
            console.log('Deleting bucket objects...');
            await emptyBucket(bucketName);
            console.log('Done');
        }
        await send(event, bucketName, 'SUCCESS');
    } catch (error) {
        if (error instanceof Error) {
            await send(event, bucketName, 'FAILED', {}, error.message);
        } else {
            await send(event, bucketName, 'FAILED', {}, 'Unknown error');
        }
        console.error(error);
    }
};
const emptyBucket = async (bucket)=>{
    while(true){
        const result = await client.send(new clientS3.ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: 1000
        }));
        if (!result.Contents || result.Contents.length === 0) {
            break;
        }
        await client.send(new clientS3.DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: result.Contents.map((object)=>({
                        Key: object.Key
                    }))
            }
        }));
    }
    while(true){
        const result = await client.send(new clientS3.ListObjectVersionsCommand({
            Bucket: bucket,
            MaxKeys: 1000
        }));
        if (!result.Versions || result.Versions.length === 0) {
            break;
        }
        await client.send(new clientS3.DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: result.Versions.map((object)=>({
                        Key: object.Key,
                        VersionId: object.VersionId
                    }))
            }
        }));
    }
};

exports.handler = handler;
