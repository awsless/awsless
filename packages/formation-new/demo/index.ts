import { join } from 'node:path'
import { App, enableDebug, FileLockBackend, FileStateBackend, Stack, Terraform, tf, WorkSpace } from '../src/index.ts'
import { marshall } from '@aws-sdk/util-dynamodb'

enableDebug()

const terraform = new Terraform({
	providerLocation: join(import.meta.dirname, 'provider'),
})

// const cloudFlare = await terraform.install("cloudflare", "cloudflare");
const aws = await terraform.install('hashicorp', 'aws')
const dir = join(import.meta.dirname, 'build')

// console.log((await aws({}).prepare()).schema());

// await cloudFlare({}).generateTypes(dir);
// await aws({}).generateTypes(dir)

// const p = aws({
//   profile: "jacksclub",
//   region: "us-east-1",
// });

// await p.generateTypes(dir);

const workspace = new WorkSpace({
	providers: [
		aws({
			profile: 'jacksclub',
			region: 'us-east-1',
			defaultTags: [
				{
					tags: {
						app: 'app-2',
					},
				},
			],
		}),
		// cloudFlare({}),
	],
	backend: {
		state: new FileStateBackend({ dir }),
		lock: new FileLockBackend({ dir }),
	},
})

// ----------------------------------------

const app = new App('app-2')
const stack = new Stack(app, 'stack')

const table = new tf.aws.dynamodb.Table(stack, 'test', {
	name: 'test-2',
	billingMode: 'PAY_PER_REQUEST',
	hashKey: 'key',
	attribute: [
		{
			name: 'key',
			type: 'S',
		},
	],
	tags: {
		test: 'TEST',
	},
})

// const item = new tf.aws.dynamodb.TableItem(
// 	stack,
// 	'test',
// 	{
// 		table_name: table.name,
// 		hash_key: table.hash_key,
// 		range_key: table.range_key,
// 		item: $hash(join(import.meta.dirname, './index.ts')).pipe(hash =>
// 			JSON.stringify(
// 				marshall({
// 					key: 'key',
// 					hash,
// 				})
// 			)
// 		),
// 		// item: JSON.stringify(
// 		// 	marshall({
// 		// 		key: 'key',
// 		// 		value: $hash('./index.ts'),
// 		// 		// value: Math.random(),
// 		// 	})
// 		// ),
// 	},
// 	{
// 		// import: 'test|key|key',
// 		// retainOnDelete: true,
// 		// deletesWith: [table],
// 	}
// )

// await workspace.deploy(app)

try {
	await workspace.delete(app)
} catch (error) {
	console.log(error)
	// throw error;
}
