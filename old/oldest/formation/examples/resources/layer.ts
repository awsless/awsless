import { join } from 'path'
import { App, AppError, Asset, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('layer')
export const stack = new Stack(app, 'layer')

const bucket = new aws.s3.Bucket(stack, 'bucket', {
	name: 'awsless-formation-layer-bucket',
})

const item = new aws.s3.BucketObject(stack, 'bucket-item', {
	bucket: bucket.name,
	key: 'layer.zip',
	body: Asset.fromFile(join(process.cwd(), 'examples/resources/layer.zip')),
	contentType: 'application/zip',
})

new aws.lambda.Layer(stack, 'layer', {
	name: 'test-layer',
	description: 'test',
	architectures: ['arm64'],
	code: {
		bucket: bucket.name,
		key: item.key,
	},
})

console.log('START')

try {
	// await workspace.deployApp(app)
	await workspace.deleteApp(app)
} catch (error) {
	if (error instanceof AppError) {
		for (const issue of error.issues) {
			console.error(issue)
		}
	}

	throw error
}

console.log('END')
