import { join } from 'node:path'
import { App, enableDebug, FileLockBackend, FileStateBackend, Stack, Terraform, $, WorkSpace } from '../src/index.ts'
import { marshall } from '@aws-sdk/util-dynamodb'
import { homedir } from 'node:os'
import { createCustomResourceClass } from '../src/custom/resource.ts'
import { createCustomProvider } from '../src/custom/provider.ts'

enableDebug()

const terraform = new Terraform({
	providerLocation: join(homedir(), `.awsless/providers`),
})

// const cloudFlare = await terraform.install("cloudflare", "cloudflare");
const aws = await terraform.install('hashicorp', 'aws', '5.94.1')
const dir = join(import.meta.dirname, 'build')

// console.log((await aws({}).prepare()).schema());

// await cloudFlare({}).generateTypes(dir);
// await aws({}).generateTypes(join(homedir(), `.awsless/types`))

const p = aws({
	profile: 'jacksclub',
	region: 'us-east-1',
})

// await p.generateTypes(dir)

// type InvalidateCacheProps = {
// 	path: string
// 	versions: string[]
// }

const Test = createCustomResourceClass<{ version: number }, {}>('custom', 'test')

const testProvider = createCustomProvider('custom', {
	test: {
		async createResource(props) {
			console.log('create custom resource', props)
			return props.state
		},
		async updateResource(props) {
			console.log('update custom resource', props)
			return props.proposedState
		},
		async deleteResource(props) {
			console.log('delete custom resource', props)
		},
	},
})

const workspace = new WorkSpace({
	providers: [
		testProvider,
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
const stack2 = new Stack(app, 'stack-2')

// const test = new Test(stack, 'test', { version: 4 })
// const test = Test.get(stack, 'test', '', {

// })

// console.log(stack.resources)
// console.log('$' in obj, typeof obj.$ === 'object', obj.$ !== null, 'tag' in obj.$, typeof obj.$.tag === 'string')

// const stack2 = new Stack(app, 'stack-2')

const table = new $.aws.dynamodb.Table(stack, 'test', {
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
		test2: 'lol',
	},
})

// const iot = $.aws.iot.getEndpoint(stack2, 'test', {
// 	endpointType: 'iot:Data-ATS',
// })

// const item = new $.aws.dynamodb.TableItem(stack2, 'test', {
// 	tableName: table.name,
// 	hashKey: table.hashKey,
// 	rangeKey: table.rangeKey,
// 	// item: JSON.stringify({
// 	// 	key: { S: 'address' },
// 	// }),
// 	item: iot.endpointAddress.pipe(address =>
// 		JSON.stringify({
// 			key: { S: 'address' },
// 			address: { S: address },
// 		})
// 	),
// })

for (let i = 0; i < 20; i++) {
	new $.aws.dynamodb.TableItem(stack2, `test-${i}`, {
		tableName: table.name,
		hashKey: table.hashKey,
		rangeKey: table.rangeKey,
		item: JSON.stringify(
			marshall({
				key: i.toString(),
			})
		),
	})
}

// await workspace.deploy(app, {
// 	// 'filters': ['']
// })

// console.log(await iot.endpointAddress)

try {
	await workspace.delete(app)
} catch (error) {
	console.log(error)
	// throw error;
}
