import { fromIni } from '@aws-sdk/credential-providers'
import { aws, WorkSpace, App, Stack, local, Asset, Input } from '../src'
import { minutes } from '@awsless/duration'
// import { SharedData } from '../src/core/__shared'

const region = 'eu-west-1'
const credentials = fromIni({
	profile: 'jacksclub',
})

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({
		region,
		credentials,
		timeout: minutes(15),
	}),
	stateProvider: new local.StateProvider({
		dir: './examples/state',
	}),
	// stateProvider: new aws.dynamodb.DynamoDBStateProvider({
	// 	region,
	// 	credentials,
	// 	tableName: 'awsless-state',
	// }),
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

// const table = new aws.dynamodb.Table('test', {
// 	name: 'TEST',
// 	hash: 'key',
// 	stream: 'keys-only',
// })

// table.addItem(
// 	'test',
// 	Asset.fromJSON({
// 		key: '2',
// 	})
// )

// stack.add(table)
// stack.export('table-arn', table.arn)

// app.import('test', 'table-arn').apply(v => {
// 	console.log(v)
// })

const id = 'app'
const domain = 'examples.com'

// const configurationSet = new aws.ses.ConfigurationSet('default', {
// 	name: 'test',
// 	engagementMetrics: true,
// 	reputationMetrics: true,
// })

// stack.add(configurationSet)

const hostedZone = new aws.route53.HostedZone('zone', { name: domain })
stack.add(hostedZone)

const usEastCertificate = new aws.acm.Certificate('us-east-cert', {
	domainName: domain,
	alternativeNames: [`*.${domain}`],
	region: 'us-east-1',
})

stack.add(usEastCertificate)

hostedZone.addRecord('certificate-1', usEastCertificate.validationRecord(0))
hostedZone.addRecord('certificate-2', usEastCertificate.validationRecord(1))

stack.export(`certificate-${id}-arn`, usEastCertificate.arn)
stack.export(`hosted-zone-${id}-id`, hostedZone.id)

// ----------------------------------------------------------------

const vpc = new aws.ec2.Vpc('test-1', {
	name: 'test',
	cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
})

stack.add(vpc)

const privateRouteTable = new aws.ec2.RouteTable('private', {
	vpcId: vpc.id,
	name: 'private',
})

vpc.add(privateRouteTable)

const publicRouteTable = new aws.ec2.RouteTable('public', {
	vpcId: vpc.id,
	name: 'public',
})

vpc.add(publicRouteTable)

const gateway = new aws.ec2.InternetGateway('test', {
	name: 'test',
})

vpc.add(gateway)

const attachment = new aws.ec2.VPCGatewayAttachment('test', {
	vpcId: vpc.id,
	internetGatewayId: gateway.id,
})

vpc.add(attachment)

const route = new aws.ec2.Route('test', {
	gatewayId: gateway.id,
	routeTableId: publicRouteTable.id,
	destination: aws.ec2.Peer.anyIpv4(),
})

vpc.add(route)

const zones = ['a', 'b']
const tables = [privateRouteTable, publicRouteTable]
const subnetIds: Input<string>[] = []

let block = 0

for (const table of tables) {
	for (const i in zones) {
		const id = `${table.identifier}-${i}`
		const subnet = new aws.ec2.Subnet(id, {
			vpcId: vpc.id,
			cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
			availabilityZone: region + zones[i],
		})

		subnet.associateRouteTable(table.id)

		vpc.add(subnet)

		subnetIds.push(subnet.id)
	}
}

// ----------------------------------------------------------------

const balancer = new aws.elb.LoadBalancer('test', {
	name: 'test',
	type: 'application',
	subnets: subnetIds,
	securityGroups: [],
})

// ----------------------------------------------------------------

// const certificate = new aws.acm.Certificate('cert', {
// 	domainName: props.domain,
// 	alternativeNames: [`*.${props.domain}`],
// })
// ctx.base.export(`certificate-${id}-arn`, certificate.arn)

// const emailIdentity = new aws.ses.EmailIdentity('email-identity', {
// 	emailIdentity: domain,
// 	mailFromDomain: `mailer.${domain}`,
// 	configurationSetName: configurationSet.name,
// 	feedback: true,
// 	rejectOnMxFailure: true,
// })
// stack.add(emailIdentity)

// const bucket = new aws.s3.Bucket('test', {
// 	name: 'awsless-bucket-123',
// })

// stack.add(bucket)
// stack.export('asset-bucket-name', bucket.name)

// app.import('test', 'asset-bucket-name').apply(console.log)

// sharedData.set('asset-bucket-name', bucket.arn)

// ------------------------------------------

const main = async () => {
	// const diff1 = await workspace.diffStack(stack)
	// console.log(diff1)

	await workspace.deleteStack(stack)
	// await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
