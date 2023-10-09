
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { Extract } from 'unzipper'
import { send } from '../util.js';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { readdir, stat } from 'fs/promises';
import { extname, join } from 'path';
import { createHash } from 'crypto';
import { Upload } from "@aws-sdk/lib-storage";
import { contentType, lookup } from 'mime-types'

type File = {
	key: string
	etag: string
}

const client = new S3Client({})
const bundleFile = '/tmp/bundle.zip'
const contentsDirectory = '/tmp/contents'

export const handler = async (event:CloudFormationCustomResourceEvent) => {

	console.log('Type:', event.RequestType);
	console.log('Props:', event.ResourceProperties);

	const type = event.RequestType
	const sourceBucketName = event.ResourceProperties.sourceBucketName
	const sourceObjectKey = event.ResourceProperties.sourceObjectKey
	const sourceObjectVersion = event.ResourceProperties.sourceObjectVersion
	const destinationBucketName = event.ResourceProperties.destinationBucketName

	try {
		if(type === 'Update' || type === 'Create') {
			await sync(
				sourceBucketName,
				sourceObjectKey,
				sourceObjectVersion,
				destinationBucketName
			)
		}

		await send(event, destinationBucketName, 'SUCCESS')
	}
	catch(error) {
		if (error instanceof Error) {
			await send(event, destinationBucketName, 'FAILED', {}, error.message)
		} else {
			await send(event, destinationBucketName, 'FAILED', {}, 'Unknown error')
		}

		console.error(error);
	}
}

const sync = async (
	sourceBucketName: string,
	sourceObjectKey: string,
	sourceObjectVersion: string,
	destinationBucketName: string
) => {

	console.log('Downloading bundle...');
	await downloadAssetBundle(sourceBucketName, sourceObjectKey, sourceObjectVersion, bundleFile)

	console.log('Unzip bundle...');
	await unzipBundle(bundleFile, contentsDirectory)

	console.log('List remote files...');
	const remoteFiles = await listRemoteFiles(destinationBucketName)

	console.log('List local files...');
	const localFiles = await listLocalFiles(contentsDirectory)

	const inserts = localFiles.filter(local => {
		return !remoteFiles.find(remote => {
			return (
				local.key === remote.key &&
				local.etag === remote.etag
			)
		})
	})

	if(inserts.length > 0) {
		console.log('Upload the updated files to the destination bucket...');
		await uploadFiles(destinationBucketName, inserts)
	} else {
		console.log('Nothing to upload to the destination bucket...');
	}

	const deletes = remoteFiles.filter(remote => {
		return !localFiles.find(local => {
			return local.key === remote.key
		})
	})

	if(deletes.length > 0) {
		console.log('Delete the deleted files from the destination bucket...');
		await deleteFiles(destinationBucketName, deletes)
	} else {
		console.log('Nothing to delete from the destination bucket...');
	}
}

const uploadFiles = (bucketName: string, files:File[]) => {
	return Promise.all(files.map(async file => {
		const upload = new Upload({
			client,
			params: {
				Bucket: bucketName,
				Key: file.key,
				Body: createReadStream(join(contentsDirectory, file.key)),
				ContentType: getContentType(file.key),
				CacheControl: getCacheControl(file.key),
			}
		})

		await upload.done()
	}))
}

const deleteFiles = async (bucketName: string, files:File[]) => {
	await client.send(new DeleteObjectsCommand({
		Bucket: bucketName,
		Delete: {
			Objects: files.map(file => ({
				Key: file.key
			}))
		}
	}))
}

const getCacheControl = (file: string) => {
	const mime = lookup(file)
	const cacheAge = 31536000

	if([
		false,
		'text/html',
		'application/json',
		'application/manifest+json',
		'application/manifest',
		'text/markdown'
	].includes(mime)) {
		return `s-maxage=31536000, max-age=0`
	}

	return `public, max-age=${ cacheAge }, immutable`
}

const getContentType = (file: string) => {
	const extension = extname(file)
	return contentType(extension) || 'text/html; charset=utf-8'
}

const createETag = async (file: string) => {
	const stream = createReadStream(file)
	const hash = createHash('md5')

	await pipeline(stream, hash)

	return hash.digest('hex')
}

const listLocalFiles = async (localDirectory: string) => {
	const paths = await readdir(localDirectory, { recursive: true })
	const files: File[] = []

	await Promise.all(paths.map(async key => {
		const file = join(localDirectory, key)
		const stats = await stat(file)

		if(!stats.isFile()) {
			return
		}

		files.push({
			key,
			etag: await createETag(file)
		})
	}))

	return files
}

const listRemoteFiles = async (bucketName: string) => {
	const files: File[] = []
	let token: string | undefined

	while(true) {
		const result = await client.send(new ListObjectsV2Command({
			Bucket: bucketName,
			ContinuationToken: token,
		}))

		for(const file of result.Contents || []) {
			const hash = file.ETag!

			files.push({
				key: file.Key!,
				etag: hash.substring(1, hash.length - 1)
			})
		}

		if(!result.NextContinuationToken) {
			return files
		}

		token = result.NextContinuationToken
	}
}

const downloadAssetBundle = async (
	sourceBucketName: string,
	sourceObjectKey: string,
	sourceObjectVersion: string,
	destinationFile: string
) => {
	const file = await client.send(new GetObjectCommand({
		Bucket: sourceBucketName,
		Key: sourceObjectKey,
		VersionId: sourceObjectVersion,
	}))

	const stream = file.Body as Readable

	await pipeline(stream, createWriteStream(destinationFile))
}

const unzipBundle = async (sourceFile: string, destinationDirectory: string) => {
	await pipeline(
		createReadStream(sourceFile),
  		Extract({ path: destinationDirectory })
	)
}
