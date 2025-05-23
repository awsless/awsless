import { fromIni } from '@aws-sdk/credential-providers'
import { days, minutes } from '@awsless/duration'
import { Client } from '@grpc/grpc-js'
import { App, AppError, Asset, aws, Stack, WorkSpace } from '../src'
import { TerraformRegistryProvider } from '../src/provider/terraform/registry'
import { createVPC } from './resources/_util'

const region = 'eu-west-1'
const credentials = fromIni({
	profile: 'jacksclub',
})

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({
		region,
		credentials,
		accountId: '468004125411',
		timeout: minutes(15),
	}),
	lockProvider: new aws.dynamodb.LockProvider({
		region,
		credentials,
		tableName: 'awsless-locks',
	}),
	stateProvider: new aws.s3.StateProvider({
		region,
		credentials,
		bucket: 'awsless-state-468004125411',
	}),
	// stateProvider: new local.file.StateProvider({
	// 	dir: './examples/state',
	// }),
})

// ------------------------------------------

const app = new App('test')
app.setTag('app', 'test')

const stack = new Stack(app, 'test')
stack.setTag('stack', 'test')

// const queue = new aws.sqs.Queue(stack, 'test', {
// 	name: 'test-queue-1',
// })

// const zone = new aws.route53.HostedZone(stack, 'test', {
// 	name: 'example-123.com',
// })

// zone.addRecord('test', {
// 	name: 'lol.example-123.com',
// 	type: 'TXT',
// 	ttl: minutes(5),
// 	records: ['"test"'],
// })

// const queue = new aws.sqs.Queue(stack, 'test', {
// 	name: 'test-queue',
// })

// ;(async () => {
// 	const provider = await TerraformRegistryProvider.load('hashicorp', 'aws')

// 	// console.log(provider.versions)
// 	console.log(provider.latestVersion)
// 	console.log(provider.latestVersion?.supported)
// 	// console.log(await provider.latestVersion?.getDownloadUrl())
// 	// console.log(provider.latestVersion)
// })()

// const func = new aws.cloudFront.Function(stack, 'test', {
// 	name: 'test-fn',
// 	comment: 'test-fn',
// 	code: 'function handler(event) { return event.request }',
// })

// func.arn.apply(v => console.log(v))

// const zone = new aws.route53.HostedZone(stack, 'test', {
// 	name: 'my-domain.com',
// })

// const bucket = new aws.s3.Bucket(stack, 'test')

// const stack2 = new Stack(app, 'test-2')
// const code = new aws.s3.BucketObject(stack2, 'test', {
// 	bucket: bucket.name,
// 	key: 'code',
// 	body: Asset.fromString('lol'),
// })

// workspace.deployApp(app)

// const repo = new aws.ecr.Repository(stack, 'repo', {
// 	name: 'test',
// })

// repo.addLifecycleRule({
// 	tagStatus: 'untagged',
// 	maxImageAge: days(1),
// })

// const bucket = new aws.s3.Bucket(stack, 'test', {
// 	name: 'update-code-123',
// })

// const file = Asset.fromFile('./examples/state-data/v2.js.zip')

// const code = new aws.s3.BucketObject(stack, 'test', {
// 	bucket: bucket.name,
// 	key: 'code',
// 	body: file,
// })

// const role = new aws.iam.Role(stack, 'test', {
// 	assumedBy: 'lambda.amazonaws.com',
// })

// const lambda = new aws.lambda.Function(stack, 'test', {
// 	name: 'update-code',
// 	role: role.arn,
// 	runtime: 'nodejs20.x',
// 	handler: 'v2.default',
// 	code,
// })

// const update = new aws.lambda.SourceCodeUpdate(stack, 'test', {
// 	functionName: lambda.name,
// 	hash: file,
// 	code,
// })

// const role = new aws.iam.Role(stack, 'test', {
// 	name: 'my-test-role',
// 	assumedBy: 'ec2.amazonaws.com',
// })

// ------------------------------------------

// const channel = new aws.ivs.Channel(stack, 'test', {
// 	name: 'test',
// })

// const vpc = createVPC(stack, 'eu-west-1', 'test')

// const template = new aws.ec2.LaunchTemplate(stack, 'test', {
// 	name: 'my-test',
// 	imageId: 'ami-05172b510cbeb4f59',
// 	instanceType: 't4g.nano',
// 	userData: Asset.fromString(Buffer.from('echo 7').toString('base64')),
// })

// template.id.apply(console.log)
// template.version.apply(console.log)

// const instance = new aws.ec2.Instance(stack, 'test', {
// 	name: 'my-test-1',
// 	launchTemplate: template,
// 	subnetId: vpc.subnets.public[0]?.id,
// })

// channel.playbackUrl.apply(console.log)
// channel.

// const repo = new aws.ecr.Repository(stack, 'repo', {
// 	name: 'test',
// })

// const image = new aws.ecr.Image(stack, `image`, {
// 	repository: repo.name,
// 	name: 'test-2',
// 	tag: 'latest',
// 	hash: Asset.fromString('1'),
// })

// const cluster = new aws.ecs.Cluster(stack, 'cluster', {
// 	name: 'test',
// })

// const vpc = createVPC(stack, 'eu-west-1', 'test')

// const role = new aws.iam.Role(stack, 'test', {
// 	name: 'test',
// 	assumedBy: 'ec2.amazonaws.com',
// 	// policies: [{}],
// 	// ManagedPolicyArns
// })

// role.addManagedPolicy(aws.iam.fromAwsManagedPolicyName('AmazonEC2ContainerServiceforEC2Role'))
// role.addManagedPolicy('arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore')
// role.addManagedPolicy(aws.iam.fromAwsManagedPolicyName('AmazonECS_FullAccess'))

// const profile = new aws.iam.InstanceProfile(stack, 'test', {
// 	name: 'test',
// 	roles: [role.name],
// })

// const template = new aws.ec2.LaunchTemplate(stack, 'test', {
// 	name: 'test',
// 	// 'instanceType': 'g4ad.xlarge'
// 	instanceType: 't4g.nano',
// 	imageId: 'amzn2-ami-ecs-kernel-5.10-hvm-2.0.20240528-arm64-ebs',
// 	iamInstanceProfile: profile.arn,
// })

// amzn2-ami-ecs-kernel-5.10-hvm-2.0.20240528-arm64-ebs
// amzn2-ami-ecs-kernel-5.10-gpu-hvm-2.0.20240528-x86_64-ebs
// amzn2-ami-ecs-kernel-5.10-hvm-2.0.20240528-x86_64-ebs
// amzn2-ami-ecs-kernel-5.10-inf-hvm-2.0.20240528-x86_64-ebs
// amzn2-ami-ecs-gpu-hvm-2.0.20240528-x86_64-ebs
// amzn2-ami-ecs-hvm-2.0.20240528-arm64-ebs
// amzn2-ami-ecs-hvm-2.0.20240528-x86_64-ebs

// const autoScalingGroup = new aws.autoScaling.AutoScalingGroup(stack, 'test', {
// 	name: 'test',
// 	subnets: vpc.subnets.private.map(s => s.id),
// 	maxSize: 1,
// 	minSize: 1,
// 	launchTemplate: template,
// })

const main = async () => {
	// const diff1 = await workspace.diffStack(stack)
	// console.log(diff1)

	console.log('START')
	console.time('deploy')

	try {
		await workspace.deployApp(app)
		// await workspace.deleteApp(app, {
		// 	filters: ['test', 'test-2'],
		// })
	} catch (error) {
		if (error instanceof AppError) {
			for (const issue of error.issues) {
				console.error(issue)
			}
		}

		throw error
	}

	console.log('END')
	console.timeEnd('deploy')

	// await workspace.deleteStack(stack)
	// await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
