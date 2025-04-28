import { join } from 'node:path'
import {
	App,
	enableDebug,
	FileLockBackend,
	FileStateBackend,
	Stack,
	Terraform,
	$,
	WorkSpace,
	Resource,
	State,
} from '../src/index.ts'
import { marshall } from '@aws-sdk/util-dynamodb'
import { homedir } from 'node:os'

enableDebug()

const terraform = new Terraform({
	providerLocation: join(homedir(), `.awsless/providers`),
})

// const cloudFlare = await terraform.install("cloudflare", "cloudflare");
const aws = await terraform.install('hashicorp', 'aws', '5.94.1')
const dir = join(import.meta.dirname, 'build')

// console.log((await aws({}).prepare()).schema());

// await cloudFlare({}).generateTypes(dir);
await aws({}).generateTypes(join(homedir(), `.awsless/types`))

const p = aws({
	profile: 'jacksclub',
	region: 'us-east-1',
})

// await p.generateTypes(dir)

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
const stack1 = new Stack(app, 'stack-1')
const stack2 = new Stack(app, 'stack-2')

const table = new $.aws.dynamodb.Table(stack1, 'test', {
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

// const iot = $.aws.iot.getEndpoint(stack2, 'test', {
// 	endpointType: 'iot:Data-ATS',
// })

const item = new $.aws.dynamodb.TableItem(stack2, 'test', {
	tableName: table.name,
	hashKey: table.hashKey,
	rangeKey: table.rangeKey,
	item: JSON.stringify({
		key: { S: 'address' },
	}),
	// item: iot.endpointAddress.pipe(address =>
	// 	JSON.stringify({
	// 		key: { S: 'address' },
	// 		address: { S: address },
	// 	})
	// ),
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

await workspace.delete(app, {
	// 'filters': ['']
})

// console.log(await iot.endpointAddress)

// try {
// 	await workspace.delete(app)
// } catch (error) {
// 	console.log(error)
// 	// throw error;
// }
