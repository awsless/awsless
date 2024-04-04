import { fromIni } from '@aws-sdk/credential-providers'
import { aws, WorkSpace, App, Stack, local, Asset } from '../src'
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

const table = new aws.dynamodb.Table('test', {
	name: 'TEST',
	hash: 'key',
	stream: 'keys-only',
})

table.addItem(
	'test',
	Asset.fromJSON({
		key: '2',
	})
)

stack.add(table)
stack.export('table-arn', table.arn)

app.import('test', 'table-arn').apply(v => {
	console.log(v)
})

const id = 'app'
const domain = 'example.com'

const configurationSet = new aws.ses.ConfigurationSet('default', {
	name: 'test',
	engagementMetrics: true,
	reputationMetrics: true,
})

stack.add(configurationSet)

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

// const certificate = new aws.acm.Certificate('cert', {
// 	domainName: props.domain,
// 	alternativeNames: [`*.${props.domain}`],
// })
// ctx.base.export(`certificate-${id}-arn`, certificate.arn)

const emailIdentity = new aws.ses.EmailIdentity('email-identity', {
	emailIdentity: domain,
	mailFromDomain: `mailer.${domain}`,
	configurationSetName: configurationSet.name,
	feedback: true,
	rejectOnMxFailure: true,
})
stack.add(emailIdentity)

// const bucket = new aws.s3.Bucket('test', {
// 	name: 'awsless-bucket-123',
// })

// stack.add(bucket)
// stack.export('asset-bucket-name', bucket.name)

// app.import('test', 'asset-bucket-name').apply(console.log)

// sharedData.set('asset-bucket-name', bucket.arn)

// ------------------------------------------

const main = async () => {
	const diff1 = await workspace.diffStack(stack)
	console.log(diff1)

	// await workspace.deleteStack(stack)
	await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
