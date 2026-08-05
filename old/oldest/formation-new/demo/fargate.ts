import { homedir } from 'node:os'
import { join } from 'node:path'
import {
	$,
	App,
	enableDebug,
	FileLockBackend,
	FileStateBackend,
	Input,
	Stack,
	Terraform,
	WorkSpace,
} from '../src/index.ts'

// enableDebug()

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
const base = new Stack(app, 'base')

const cluster = new $.aws.ecs.Cluster(base, 'cluster', {
	name: 'fargate-cluster',
})

try {
	console.log('Deploying Fargate resources...')

	await workspace.deploy(app)
	// await workspace.delete(app)
} catch (error) {
	console.log(error)
	// throw error;
}
