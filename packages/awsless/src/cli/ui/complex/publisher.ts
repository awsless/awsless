import { readFile } from "fs/promises"
import { App } from "../../../formation/app.js"
import { assetDir } from "../../../util/path.js"
import { RenderFactory } from "../../lib/renderer.js"
import { loadingDialog } from "../layout/dialog.js"
import { join } from "path"
import { assetBucketName } from "../../../formation/bootstrap.js"
import { GetObjectCommand, ObjectCannedACL, PutObjectCommand, S3Client, StorageClass } from "@aws-sdk/client-s3"
import { Config } from "../../../config.js"

export const assetPublisher = (config:Config, app:App):RenderFactory => {
	const client = new S3Client({
		credentials: config.credentials,
		region: config.region,
	})

	return async (term) => {
		const done = term.out.write(loadingDialog('Publishing stack assets to AWS...'))

		await Promise.all(app.stacks.map(async stack => {
			await Promise.all([ ...stack.assets ].map(async asset => {
				await asset.publish?.({
					async read(file) {
						const path = join(assetDir, asset.type, app.name, stack.name, asset.id, file)
						const data = await readFile(path)

						return data
					},
					async publish(name, data, hash) {
						const key = `${app.name}/${ stack.name }/function/${name}`
						const bucket = assetBucketName(config.account, config.region)

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
							return {
								bucket,
								key,
								version: getResult.VersionId!
							}
						}

						const putResult = await client.send(new PutObjectCommand({
							Bucket: bucket,
							Key: key,
							Body: data,
							ACL: ObjectCannedACL.private,
							StorageClass: StorageClass.STANDARD,
							Metadata: {
								hash
							},
						}))

						return {
							bucket,
							key,
							version: putResult.VersionId!
						}
					}
				})
			}))
		}))

		done('Done publishing stack assets to AWS')
	}
}
