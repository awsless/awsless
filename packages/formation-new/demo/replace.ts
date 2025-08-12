import { homedir } from 'node:os'
import { join } from 'node:path'
import { $, App, enableDebug, FileLockBackend, FileStateBackend, Stack, Terraform, WorkSpace } from '../src/index.ts'

enableDebug()

const terraform = new Terraform({
	providerLocation: join(homedir(), `.awsless/providers`),
})

const aws = await terraform.install('hashicorp', 'aws', '5.94.1')
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

const app = new App('app')
const stack = new Stack(app, 'stack')

const table = new $.aws.dynamodb.Table(
	stack,
	'test',
	{
		name: 'test-3',
		billingMode: 'PAY_PER_REQUEST',
		hashKey: 'key',

		attribute: [
			{
				name: 'key',
				type: 'S',
			},
		],
	},
	{
		replaceOnChanges: [
			//
			// 'name',
			'hashKey',
			// 'sortKey',
			// 'attribute',
		],
	}
)

try {
	await workspace.deploy(app)
} catch (error) {
	console.log(error)
	// throw error;
}
