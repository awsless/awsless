import { App } from './resource/app'
import { Stack } from './resource/stack'
import { fromIni } from '@aws-sdk/credential-providers'
import { WorkSpace } from './resource/workspace'
import { LocalStateProvider } from './provider/local/state'
import { Asset } from './resource/asset'
import { aws } from './provider/aws'
// import { days, minutes } from '@awsless/duration'
// import { Input } from './resource/output'

const region = 'eu-west-1'
const credentials = fromIni({
	profile: 'jacksclub',
})

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({ region, credentials }),
	stateProvider: new LocalStateProvider({
		dir: './state',
	}),
})

workspace.on('stack', e =>
	console.log(
		//
		new Date(),
		'[Stack]'.padEnd(30),
		// e.stack.name,
		e.operation.toUpperCase(),
		e.status.toUpperCase()
	)
)

workspace.on('resource', e =>
	console.log(
		//
		new Date(),
		`[${e.type}]`.padEnd(30),
		e.operation.toUpperCase(),
		e.status.toUpperCase(),
		e.reason?.message ?? ''
	)
)

const app = new App('test')

// ------------------------------------------

const stack = new Stack('test')

app.add(stack)

// ------------------------------------------

// const email = new aws.ses.EmailIdentity('test', {
// 	emailIdentity: 'info@jacksclub.dev',
// })

// stack.add(email)

// const config = new aws.ses.ConfigurationSet('test', {
// 	name: 'test',
// })

// stack.add(config)

// ------------------------------------------

// const hostedZone = new aws.route53.HostedZone('test', {
// 	name: 'mycustomdomain123.com',
// })

// stack.add(hostedZone)

// stack.add(recordSetGroup)

// const recordSet = new aws.route53.RecordSet('test', {
// 	hostedZoneId: hostedZone.id,
// 	name: hostedZone.name.apply(n => `test.${n}`),
// 	type: 'CNAME',
// 	ttl: minutes(5),
// 	records: ['google.com'],
// })

// stack.add(recordSet)

// ------------------------------------------

// ------------------------------------------

// const vpc = new aws.ec2.Vpc('test-1', {
// 	name: 'test',
// 	cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
// })

// // // vpc.addRouteTable('private')

// stack.add(vpc)

// const privateRouteTable = new aws.ec2.RouteTable('private', {
// 	vpcId: vpc.id,
// 	name: 'private',
// })

// vpc.add(privateRouteTable)

// const publicRouteTable = new aws.ec2.RouteTable('public', {
// 	vpcId: vpc.id,
// 	name: 'public',
// })

// vpc.add(publicRouteTable)

// const gateway = new aws.ec2.InternetGateway('test', {
// 	name: 'test',
// })

// vpc.add(gateway)

// const attachment = new aws.ec2.VPCGatewayAttachment('test', {
// 	vpcId: vpc.id,
// 	internetGatewayId: gateway.id,
// })

// vpc.add(attachment)

// const route = new aws.ec2.Route('test', {
// 	gatewayId: gateway.id,
// 	routeTableId: publicRouteTable.id,
// 	destination: aws.ec2.Peer.anyIpv4(),
// })

// vpc.add(route)

// const zones = ['a', 'b']
// const tables = [privateRouteTable, publicRouteTable]
// const subnetIds: Input<string>[] = []

// let block = 0

// for (const table of tables) {
// 	for (const i in zones) {
// 		const id = `${table.identifier}-${i}`
// 		const subnet = new aws.ec2.Subnet(id, {
// 			vpcId: vpc.id,
// 			cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
// 			availabilityZone: region + zones[i],
// 		})

// 		subnet.associateRouteTable(table.id)

// 		vpc.add(subnet)

// 		subnetIds.push(subnet.id)
// 	}
// }

// ------------------------------------------

// const subnetGroup = new aws.memorydb.SubnetGroup('test', {
// 	name: 'test',
// 	subnetIds,
// })

// stack.add(subnetGroup)

// const securityGroup = new aws.ec2.SecurityGroup('test', {
// 	name: 'test',
// 	vpcId: vpc.id,
// 	description: 'test',
// })

// securityGroup.addIngressRule({
// 	peer: aws.ec2.Peer.anyIpv4(),
// 	port: aws.ec2.Port.allTraffic(),
// })

// stack.add(securityGroup)

// const redisCluster = new aws.memorydb.Cluster('test', {
// 	name: 'test',
// 	type: 't4g.small',
// 	aclName: 'open-access',
// 	securityGroupIds: [securityGroup.id],
// 	subnetGroupName: subnetGroup.name,
// })

// stack.add(redisCluster)

// ------------------------------------------

// const table = new aws.dynamodb.Table('test', {
// 	name: 'awsless-formation-test',
// 	hash: 'key',
// 	pointInTimeRecovery: false,
// })

// stack.add(table)

// table.addItem(
// 	'test',
// 	Asset.fromJSON({
// 		key: '1',
// 		message: 'Welcome Home!!!',
// 	})
// )

// ------------------------------------------

// ------------------------------------------

const bucket = new aws.s3.Bucket('test', {
	name: 'awsless-formation-test',
	versioning: true,
	forceDelete: true,
})

stack.add(bucket)

// const code = bucket.addObject('test', {
// 	key: 'lambda',
// 	body: Asset.fromFile('./state-data/index.js.zip'),
// })

// ------------------------------------------

const role = new aws.iam.Role('test', {
	assumedBy: 'lambda.amazonaws.com',
})

stack.add(role)

// const policy = role.addPolicy('test', {
// 	name: 'test',
// })

const lambda = new aws.lambda.Function('test', {
	name: 'awsless-formation-test',
	description: 'Test',
	// code,
	code: {
		zipFile: `exports.default = function(){ return Promise.resolve({ statusCode: 200, body: 'HELLO' }) }`,
	},
	role: role.arn,
	log: {
		format: 'json',
		level: 'error',
		system: 'warn',
	},
	environment: {
		TEST: '1',
	},
})

const url = lambda.enableUrlAccess()

stack.add(lambda)

// const logGroup = new aws.cloudWatch.LogGroup('test', {
// 	name: lambda.name.apply(name => `/aws/lambda/${name}`),
// 	retention: days(3),
// })

// policy.addStatement(...logGroup.permissions)

// lambda.add(logGroup)

// ------------------------------------------

// url.url.apply(url => console.log(url.split('/')[2]))

const hostedZone = new aws.route53.HostedZone('test', {
	name: 'mycustomdomain123.com',
})

stack.add(hostedZone)

const certificate = new aws.acm.Certificate('test', {
	region: 'us-east-1',
	domainName: 'example.com',
	validationOptions: [
		{
			domainName: 'example.com',
			validationDomain: 'example.com',
		},
	],
})

stack.add(certificate)

// certificate.addValidationRecords({
// 	hostedZoneId: hostedZone.id,
// })

// const certificateValidation = new aws.acm.CertificateValidation('test', {
// 	certificateArn: certificate.arn,
// })

// stack.add(certificateValidation)

// const distribution = new aws.cloudFront.Distribution('test', {
// 	name: 'test',
// 	targetOriginId: 'lambda',
// 	certificateArn: certificate.issuedArn,
// 	origins: [
// 		{
// 			id: 'lambda',
// 			protocol: 'https-only',
// 			domainName: url.domain,
// 		},
// 	],
// })

// stack.add(distribution)

// ------------------------------------------

// const userPool = new aws.cognito.UserPool('test', {
// 	name: 'test',
// 	triggers: {
// 		afterLogin: lambda.arn,
// 	},
// })

// stack.add(userPool)

// userPool.addClient('test', {
// 	name: 'test',
// })

// const domain = new aws.cognito.UserPoolDomain('test', {
// 	userPoolId: userPool.id,
// 	domain: 'example.com',
// })

// userPool.add(domain)

// const client = new aws.cognito.UserPoolClient('test', {
// 	userPoolId: userPool.id,
// 	name: 'test',
// })

// stack.add(client)

// ------------------------------------------

// const rule = new aws.events.Rule('test', {
// 	name: 'test',
// 	schedule: 'rate(5 minutes)',
// 	targets: [
// 		{
// 			id: 'test',
// 			arn: lambda.arn,
// 		},
// 	],
// })

// stack.add(rule)

// ------------------------------------------

// const topicRule = new aws.iot.TopicRule('test', {
// 	name: 'test',
// 	sql: `SELECT * FROM '$aws/events/presence/connected/+'`,
// 	actions: [{ lambda: { functionArn: lambda.arn } }],
// })

// stack.add(topicRule)

// ------------------------------------------

// const queue = new aws.sqs.Queue('test', {
// 	name: 'awsless-formation-test-2',
// 	retentionPeriod: minutes(10),
// })

// stack.add(queue)

// ------------------------------------------

// const topic = new aws.sns.Topic('test', {
// 	name: 'awsless-formation-test',
// })

// stack.add(topic)

// ------------------------------------------

const main = async () => {
	// await workspace.deleteStack(stack)
	await workspace.deployStack(stack)

	// console.log(JSON.stringify(state, undefined, 2))

	// const id = 'awsless-formation-test'

	// const newTable = new Table('test', {
	// 	name: 'awsless-formation-test-2',
	// 	hash: wrap(''),
	// })

	// console.log(table.toJSON())

	// await provider.create(table.toJSON())
	// await awsProvider.delete(id, table.toJSON())
	// await provider.update(id, table.toJSON(), newTable.toJSON())
	// const result = await provider.get(id, table.toJSON())
	// console.log(result)
}

main()
