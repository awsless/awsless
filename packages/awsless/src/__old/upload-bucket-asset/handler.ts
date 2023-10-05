import { sendCode } from '../util.js';


import { S3Client, ListObjectsV2Command, ListObjectVersionsCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { createUnzip } from 'zlib';

const client = new S3Client({})

const downloadAssetBundle = async (sourceBucketName, sourceObjectKey, destinationFile) => {
	const file = await client.send(new GetObjectCommand({
		Bucket: sourceBucketName,
		Key: sourceObjectKey,
	}))

	await pipeline(file.Body as Readable, createWriteStream(destinationFile))
}

const unzipBundle = async (sourceFile, destinationDirectory) => {
	await pipeline(
		createReadStream(sourceFile),
		createUnzip(),
		createWriteStream(destinationDirectory)
	)
}

const diffMap = (sourceDirectory, destinationBucketName) => {
	fs.createReadStream('path/to/archive.zip')
  .pipe(unzipper.Parse())
  .on('entry', function (entry) {
    const fileName = entry.path;
    const type = entry.type; // 'Directory' or 'File'
    const size = entry.vars.uncompressedSize; // There is also compressedSize;
    if (fileName === "this IS the file I'm looking for") {
      entry.pipe(fs.createWriteStream('output/path'));
    } else {
      entry.autodrain();
    }
  });
}


// export const uploadBucketAssetHandlerCode = /* JS */ `

// const { S3Client } = require('@aws-sdk/client-s3')

// const client = new S3Client({})

// ${ sendCode }

// exports.handler = async (event) => {
// 	const type = event.RequestType
// 	const sourceBucketName = event.ResourceProperties.sourceBucketName
// 	const sourceObjectKey = event.ResourceProperties.sourceObjectKey
// 	const destinationBucketName = event.ResourceProperties.destinationBucketName

// 	try {
// 		if(type === 'Update' && type === 'Create') {
// 			await sync(sourceBucketName, sourceObjectKey, destinationBucketName)
// 		}

// 		await send(event, bucketName, 'SUCCESS')
// 	}
// 	catch(error) {
// 		if (error instanceof Error) {
// 			await send(event, bucketName, 'FAILED', {}, error.message)
// 		} else {
// 			await send(event, bucketName, 'FAILED', {}, 'Unknown error')
// 		}
// 	}
// }

// const emptyBucket = async (bucket) => {
// 	while(true) {
// 		const result = await client.send(new ListObjectsV2Command({
// 			Bucket: bucket,
// 			MaxKeys: 1000
// 		}))

// 		if(!result.Contents || result.Contents.length === 0) {
// 			break
// 		}

// 		await client.send(new DeleteObjectsCommand({
// 			Bucket: bucket,
// 			Delete: {
// 				Objects: result.Contents.map(object => ({
// 					Key: object.Key,
// 				}))
// 			},
// 		}))
// 	}

// 	while(true) {
// 		const result = await client.send(new ListObjectVersionsCommand({
// 			Bucket: bucket,
// 			MaxKeys: 1000
// 		}))

// 		if(!result.Versions || result.Versions.length === 0) {
// 			break
// 		}

// 		await client.send(new DeleteObjectsCommand({
// 			Bucket: bucket,
// 			Delete: {
// 				Objects: result.Versions.map(object => ({
// 					Key: object.Key,
// 					VersionId: object.VersionId,
// 				}))
// 			},
// 		}))
// 	}
// }
// `
