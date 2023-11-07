import { definePlugin } from '../plugin.js'
import { Code } from '../formation/resource/lambda/code.js'
import { Function } from '../formation/resource/lambda/function.js'
import { Size } from '../formation/property/size.js'
import { Duration } from '../formation/property/duration.js'

export const featurePlugin = definePlugin({
	name: 'feature',
	onApp({ config, bootstrap }) {
		// ---------------------------------------------------------------------
		// Feature: Delete Bucket
		// ---------------------------------------------------------------------

		const deleteBucketLambda = new Function('delete-bucket', {
			name: `${config.name}-delete-bucket`,
			code: Code.fromFeature('delete-bucket'),
		})
			.enableLogs(Duration.days(3))
			.addPermissions({
				actions: ['s3:*'],
				resources: ['*'],
			})

		// ---------------------------------------------------------------------
		// Feature: Upload Bucket Asset
		// ---------------------------------------------------------------------

		const uploadBucketAssetLambda = new Function('upload-bucket-asset', {
			name: `${config.name}-upload-bucket-asset`,
			code: Code.fromFeature('upload-bucket-asset'),
			memorySize: Size.gigaBytes(2),
		})
			.enableLogs(Duration.days(3))
			.addPermissions({
				actions: ['s3:*'],
				resources: ['*'],
			})

		// ---------------------------------------------------------------------
		// Feature: Invalidate Cache
		// ---------------------------------------------------------------------

		const invalidateCacheLambda = new Function('invalidate-cache', {
			name: `${config.name}-invalidate-cache`,
			code: Code.fromFeature('invalidate-cache'),
		})
			.enableLogs(Duration.days(3))
			.addPermissions({
				actions: ['cloudfront:*'],
				resources: ['*'],
			})

		// ---------------------------------------------------------------------
		// ---------------------------------------------------------------------
		// ---------------------------------------------------------------------

		bootstrap.add(deleteBucketLambda, uploadBucketAssetLambda, invalidateCacheLambda)

		bootstrap
			.export('feature-delete-bucket', deleteBucketLambda.arn)
			.export('feature-upload-bucket-asset', uploadBucketAssetLambda.arn)
			.export('feature-invalidate-cache', invalidateCacheLambda.arn)

		// ---------------------------------------------------------------------
		// ---------------------------------------------------------------------
		// ---------------------------------------------------------------------
	},
})
