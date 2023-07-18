import { Stack } from "aws-cdk-lib";
import { Config } from "../../../config";
import { functionDir } from "../../../util/path";
import { join } from "path";
import { readFile } from "fs/promises";
import { GetObjectCommand, ObjectCannedACL, PutObjectCommand, S3Client, StorageClass } from "@aws-sdk/client-s3";
import { assetBucketName } from "../../../stack/bootstrap";

export const publishFunctionAsset = async (config: Config, stack: Stack, id: string) => {
	const bucket = assetBucketName(config)
	const key = `${config.name}/${ stack.artifactId }/function/${id}.zip`

	const funcPath = join(functionDir, config.name, stack.artifactId, id)
	const bundleFile = join(funcPath, 'bundle.zip')
	const hashFile = join(funcPath, 'HASH')

	const hash = await readFile(hashFile, 'utf8')
	const file = await readFile(bundleFile, 'utf8')

	const client = new S3Client({
		credentials: config.credentials,
		region: config.region,
	})

	let getResult

	try {
		getResult = await client.send(new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		}))
	} catch (error) {
		if(error instanceof Error && error.name === 'NoSuchKey') {

		} else {
			throw error
		}
	}

	if(getResult?.Metadata?.hash === hash) {
		return getResult.VersionId!
	}

	const putResult = await client.send(new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: file,
		ACL: ObjectCannedACL.private,
		StorageClass: StorageClass.STANDARD,
		Metadata: {
			hash
		},
	}))

	return putResult.VersionId!
}
