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

// const cloudFlare = await terraform.install("cloudflare", "cloudflare");
// const archive = await terraform.install('hashicorp', 'archive')
const aws = await terraform.install('hashicorp', 'aws', '5.94.1')
const dir = join(import.meta.dirname, 'build')

// console.log((await aws({}).prepare()).schema());

// await cloudFlare({}).generateTypes(dir);
// await aws({}).generateTypes(join(homedir(), `.awsless/types`))
// await archive({}).generateTypes(dir)

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
		}),
		// archive({}),
		// cloudFlare({}),
	],
	backend: {
		state: new FileStateBackend({ dir }),
		lock: new FileLockBackend({ dir }),
	},
})

// ----------------------------------------

const app = new App('app')
const base = new Stack(app, 'base')
const assets = new $.aws.s3.Bucket(base, 'assets', {
	bucket: 'assets-super-random-1',
})

const file = join(import.meta.dirname, 'asset/code.zip')
const stack = new Stack(app, 'stack')
const code = new $.aws.s3.BucketObject(stack, 'code', {
	bucket: assets.bucket,
	key: 'code.zip',
	source: file,
	sourceHash: $hash(file),
})

const assumeRole = $.aws.iam.getPolicyDocument({
	version: '2012-10-17',
	statement: [
		{
			effect: 'Allow',
			actions: ['sts:AssumeRole'],
			principals: [
				{
					type: 'Service',
					identifiers: ['lambda.amazonaws.com'],
				},
			],
		},
	],
})

// $.aws.s3.getBucketObject({
// 	'bucket':
// })

const role = new $.aws.iam.Role(stack, 'role', {
	name: 'role',
	assumeRolePolicy: assumeRole.json,
	// assumeRolePolicy: JSON.stringify({
	// 	Version: '2012-10-17',
	// 	Statement: [
	// 		{
	// 			Effect: 'Allow',
	// 			Action: 'sts:AssumeRole',
	// 			Principal: {
	// 				Service: ['lambda.amazonaws.com'],
	// 			},
	// 		},
	// 	],
	// }),
})

// const caller = $.aws.caller.getIdentity({})

const variables: Record<string, Input<string>> = {}

const lambda = new $.aws.lambda.Function(stack, 'function', {
	functionName: 'function',
	description: 'Test function',
	role: role.arn,
	architectures: ['arm64'],
	runtime: 'nodejs22.x',
	handler: 'index.default',
	memorySize: 128,

	s3Bucket: code.bucket,
	s3Key: code.key,
	s3ObjectVersion: code.versionId,

	sourceCodeHash: $hash(file),

	environment: {
		variables,
	},
})

const logs = new $.aws.cloudwatch.LogGroup(stack, 'logs', {
	// name: lambda.function_name.pipe(name => `/aws/lambda/${name}`),
	name: lambda.functionName,
	namePrefix: '/aws/lambda/',
	// retention: props.log.retention,
})

const policy = $.aws.iam.getPolicyDocument({
	// statement: {
	// 	effect: 'Allow',
	// 	actions: ['logs:CreateLogStream'],
	// 	resources: [logs.arn],
	// },
	statement: [
		{
			effect: 'Allow',
			actions: ['logs:CreateLogStream'],
			resources: [logs.arn],
		},
		{
			effect: 'Allow',
			actions: ['logs:PutLogEvents'],
			resources: [logs.arn.pipe(arn => `${arn}:*`)],
		},
		{
			effect: 'Allow',
			actions: ['logs:*'],
			resources: ['*'],
		},
	],
})

const rolePolicy = new $.aws.iam.RolePolicy(stack, 'policy', {
	name: 'policy',
	role: role.name,
	policy: policy.json,
	// policy: logs.arn.pipe(arn =>
	// 	JSON.stringify({
	// 		Version: '2012-10-17',
	// 		Statement: [
	// 			{
	// 				Effect: 'Allow',
	// 				Action: 'logs:CreateLogStream',
	// 				Resource: arn,
	// 			},
	// 			{
	// 				Effect: 'Allow',
	// 				Action: 'logs:PutLogEvents',
	// 				Resource: `${arn}:*`,
	// 			},
	// 		],
	// 	})
	// ),
})

// variables.$.attachDepenencies(caller.accounts)
// variables.TEST = caller.accountId

// const invocation = $.aws.getLambdaInvocation({
// 	function_name: lambda.function_name,
// 	input: JSON.stringify({
// 		test: 'Hello',
// 	}),
// })

try {
	await workspace.deploy(app)
	// await workspace.deploy(app, { filters: ['stack'] })
	// await workspace.delete(app)
} catch (error) {
	console.log(error)
	// throw error;
}

// await lambda.environment.pipe(v => console.log(v))

// console.log(await invocation.result)

// 	new aws.lambda.SourceCodeUpdate(group, 'update', {
// 		functionName: lambda.name,
// 		version: Asset.fromFile(getBuildPath('function', name, 'HASH')),
// 		architecture: props.architecture,
// 		code,
// 	})

// 	ctx.registerPolicy(policy)
