import { readFile } from 'fs/promises'
import { App } from '../../../formation/app.js'
import { directories } from '../../../util/path.js'
import { RenderFactory } from '../../lib/renderer.js'
import { loadingDialog } from '../layout/dialog.js'
import { join } from 'path'
import { assetBucketName } from '../../../formation/bootstrap.js'
import { GetObjectCommand, ObjectCannedACL, PutObjectCommand, S3Client, StorageClass } from '@aws-sdk/client-s3'
import { Config } from '../../../config/config.js'
import { promise } from 'fastq'
import { Stack } from '../../../formation/stack.js'
import { Asset } from '../../../formation/asset.js'
import { debug } from '../../logger.js'
import { style } from '../../style.js'

export const assetPublisher = (config: Config, app: App): RenderFactory => {
	debug('Start publishing assets to AWS')

	const client = new S3Client({
		credentials: config.credentials,
		region: config.app.region,
		maxAttempts: 5,
	})

	return async term => {
		const done = term.out.write(loadingDialog('Publishing stack assets to AWS...'))

		const queue = promise(async ({ stack, asset }: { stack: Stack; asset: Asset }) => {
			const getFullPath = (file: string) => {
				return join(directories.asset, asset.type, app.name, stack.name, asset.id, file)
			}

			await asset.publish?.({
				async read(fingerprint, files) {
					const prev = await readFile(getFullPath('FINGER_PRINT'), 'utf8')
					if (prev !== fingerprint) {
						debug('Outdated fingerprint:', stack.name, asset.type, asset.id)
						throw new TypeError(`Outdated fingerprint: ${fingerprint}`)
					}

					return Promise.all(
						files.map(file => {
							return readFile(getFullPath(file))
						})
					)
				},
				async publish(name, data, hash) {
					const key = `${app.name}/${stack.name}/${asset.type}/${name}`
					const bucket = assetBucketName(config.account, config.app.region)

					let getResult

					try {
						getResult = await client.send(
							new GetObjectCommand({
								Bucket: bucket,
								Key: key,
							})
						)
					} catch (error) {
						if (error instanceof Error && error.name === 'NoSuchKey') {
							// continue
						} else {
							throw error
						}
					}

					if (getResult?.Metadata?.hash === hash.toString('utf8')) {
						debug('Skip publishing:', style.info(key))
						return {
							bucket,
							key,
							version: getResult.VersionId!,
						}
					}

					debug('Publish:', style.info(key), getResult?.Metadata?.hash, hash.toString('utf8'))

					const putResult = await client.send(
						new PutObjectCommand({
							Bucket: bucket,
							Key: key,
							Body: data,
							ACL: ObjectCannedACL.private,
							StorageClass: StorageClass.STANDARD,
							Metadata: {
								hash: hash.toString('utf8'),
							},
						})
					)

					return {
						bucket,
						key,
						version: putResult.VersionId!,
					}
				},
			})
		}, 5)

		await Promise.all(
			app.stacks.map(async stack => {
				await Promise.all(
					[...stack.assets].map(async asset => {
						await queue.push({ stack, asset })
					})
				)
			})
		)

		done('Done publishing stack assets to AWS')
	}
}
