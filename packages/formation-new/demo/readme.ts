import { join } from 'node:path'
import { App, enableDebug, FileLockBackend, FileStateBackend, Stack, Terraform, tf, WorkSpace } from '../src/index.ts'

enableDebug()

const terraform = new Terraform({
	providerLocation: join(import.meta.dirname, 'provider'),
})

// const cloudFlare = await terraform.install("cloudflare", "cloudflare");
const aws = await terraform.install('hashicorp', 'aws', '5.93.0')
const dir = join(import.meta.dirname, 'build')

const workspace = new WorkSpace({
	providers: [
		aws({
			profile: 'jacksclub',
			region: 'us-east-1',
		}),
	],
	backend: {
		state: new FileStateBackend({ dir }),
		lock: new FileLockBackend({ dir }),
	},
})

// ----------------------------------------

const app = new App('todo-app')
const storage = new Stack(app, 'storage')
const list = new tf.aws.s3.Bucket(storage, 'list', {})

const items = new Stack(app, 'items')
const todo = new tf.aws.s3.BucketObject(items, 'item', {
	bucket: list.bucket,
	key: 'item-1',
	content: JSON.stringify({
		title: 'Write docs...',
		done: true,
	}),
})

await workspace.deploy(app)
