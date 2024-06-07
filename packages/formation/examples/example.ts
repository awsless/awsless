import { fromIni } from '@aws-sdk/credential-providers'
import { minutes } from '@awsless/duration'
import { App, AppError, Asset, aws, Stack, WorkSpace } from '../src'
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
		bucket: 'awsless-state',
	}),
	// stateProvider: new local.file.StateProvider({
	// 	dir: './examples/state',
	// }),
})

// ------------------------------------------

const app = new App('test')
const stack = new Stack(app, 'test')

// ------------------------------------------

// const channel = new aws.ivs.Channel(stack, 'test', {
// 	name: 'test',
// })

const vpc = createVPC(stack, 'eu-west-1', 'test')

const template = new aws.ec2.LaunchTemplate(stack, 'test', {
	name: 'my-test',
	imageId: 'ami-05172b510cbeb4f59',
	instanceType: 't4g.nano',
	userData: Asset.fromString(Buffer.from('echo 7').toString('base64')),
})

template.id.apply(console.log)
template.version.apply(console.log)

const instance = new aws.ec2.Instance(stack, 'test', {
	name: 'my-test-1',
	launchTemplate: template,
	subnetId: vpc.subnets.public[0]?.id,
})

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

	// await workspace.deleteStack(stack)
	// await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
