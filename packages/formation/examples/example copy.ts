import { fromIni } from '@aws-sdk/credential-providers'
import { aws, Asset, local, WorkSpace, App, Stack } from '../src'
import { days, minutes } from '@awsless/duration'

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

const assetBucket = new aws.s3.Bucket('assets', {
	name: 'awsless-assets',
	forceDelete: true,
})

stack.add(assetBucket)

const bucket = new aws.s3.Bucket('test-1', {
	name: 'awsless-formation-test',
	// accessControl: 'public-read',
	// forceDelete: true,
	// versioning: true,
	// accessControl: 'public-read',
	website: {
		indexDocument: 'index.html',
		errorDocument: 'error.html',
	},
})

stack.add(bucket)

// const code = bucket.addObject('test', {
// 	key: 'lambda',
// 	body: Asset.fromFile('./state-data/index.js.zip'),
// })

bucket.addObject('test', {
	key: 'index.html',
	body: Asset.fromString('<h1>Working!</h1>'),
})

// bucket.domainName.apply(console.log)

// ------------------------------------------

const role = new aws.iam.Role('test', {
	assumedBy: 'lambda.amazonaws.com',
})

stack.add(role)

// const policy = role.addPolicy('test', {
// 	name: 'test',
// })

const ssrCode = new aws.s3.BucketObject('ssr-lambda', {
	bucket: assetBucket.name,
	key: 'ssr-lambda',
	body: Asset.fromFile('./state-data/ssr.js.zip'),
})

assetBucket.add(ssrCode)

const ssrLambda = new aws.lambda.Function('ssr-lambda', {
	name: 'awsless-formation-ssr',
	code: ssrCode,
	role: role.arn,
})

const url = ssrLambda.enableUrlAccess()

stack.add(ssrLambda)

// const logGroup = new aws.cloudWatch.LogGroup('test', {
// 	name: lambda.name.apply(name => `/aws/lambda/${name}`),
// 	retention: days(3),
// })

// policy.addStatement(...logGroup.permissions)

// lambda.add(logGroup)

// ------------------------------------------

const zone = new aws.route53.HostedZone('test', {
	name: 'getblockalert.com',
})

stack.add(zone)

// zone.nameServers.apply(console.log)

const certificate = new aws.acm.Certificate('test-1', {
	region: 'us-east-1',
	domainName: 'getblockalert.com',
	alternativeNames: ['*.getblockalert.com'],
})

stack.add(certificate)

// Add certificate validation record to DNS record
zone.addRecord('test-1', certificate.validationRecord(0))

certificate.

// certificate.addValidationRecords({
// 	hostedZoneId: hostedZone.id,
// })

const originAccessControl = new aws.cloudFront.OriginAccessControl('test', {
	name: 'test',
	type: 's3',
})

stack.add(originAccessControl)

const originRequestPolicy = new aws.cloudFront.OriginRequestPolicy('test', {
	name: 'test',
})

stack.add(originRequestPolicy)

const cachePolicy = new aws.cloudFront.CachePolicy('test', {
	name: 'test',
	minTtl: minutes(5),
	maxTtl: days(365),
	defaultTtl: days(1),
})

stack.add(cachePolicy)

const distribution = new aws.cloudFront.Distribution('test', {
	name: 'test',
	targetOriginId: 'default',
	certificateArn: certificate.issuedArn,
	cachePolicyId: cachePolicy.id,
	originRequestPolicyId: originRequestPolicy.id,
	originGroups: [
		{
			id: 'default',
			members: ['lambda', 'bucket'],
			statusCodes: [403, 404],
		},
	],
	origins: [
		{
			id: 'bucket',
			domainName: bucket.regionalDomainName,
			originAccessControlId: originAccessControl.id,
		},
		{
			id: 'lambda',
			protocol: 'https-only',
			domainName: url.domain,
		},
	],
})

stack.add(distribution)

// distribution.domainName.apply(console.log)

zone.addRecord('site', {
	type: 'A',
	name: 'getblockalert.com',
	alias: distribution.aliasTarget,
})

// const record = new RecordSet(`site`, {
// 	hostedZoneId: zone.id,
// 	type: 'A',
// 	name: 'getblockalert.com',
// 	alias: distribution.aliasTarget,
// })

// zone.add(record)

// ------------------------------------------

const mergedRole = new aws.iam.Role('merged', {
	assumedBy: 'appsync.amazonaws.com',
	policies: [
		{
			name: 'merge-policy',
			statements: [
				{
					actions: [
						//
						'appsync:StartSchemaMerge',
						'appsync:SourceGraphQL',
					],
					resources: ['arn:aws:appsync:*:*:apis/*'],
				},
			],
		},
	],
})

stack.add(mergedRole)

const apiMerged = new aws.appsync.GraphQLApi('merged', {
	name: 'awsless-test-merged',
	type: 'merged',
	role: mergedRole.arn,
	auth: {
		default: {
			type: 'iam',
		},
	},
})

stack.add(apiMerged)

const api = new aws.appsync.GraphQLApi('test', {
	name: 'awsless-test-single',
	// visibility: false,
	auth: {
		default: {
			type: 'iam',
		},
	},
})

stack.add(api)

const apiAssociation = new aws.appsync.SourceApiAssociation('test', {
	mergedApiId: apiMerged.id,
	sourceApiId: api.id,
})

stack.add(apiAssociation)

// api.assignDomainName('test', {
// 	domainName: 'api.getblockalert.com',
// 	certificateArn: certificate.arn,
// })

// zone.addRecord('site', {
// 	type: 'A',
// 	name: 'getblockalert.com',
// 	alias: distribution.aliasTarget,
// })

const schema = new aws.appsync.GraphQLSchema('test', {
	apiId: api.id,
	definition: Asset.fromString('type Query { test: Boolean }'),
})

stack.add(schema)

const apiCode = new aws.s3.BucketObject('api-lambda', {
	bucket: assetBucket.name,
	key: 'api-lambda',
	body: Asset.fromFile('./state-data/api.js.zip'),
})

assetBucket.add(apiCode)

const apiLambda = new aws.lambda.Function('api-lambda', {
	name: 'awsless-formation-api',
	handler: 'api.default',
	code: apiCode,
	role: role.arn,
})

stack.add(apiLambda)

const apiEventInvoke = new aws.lambda.EventInvokeConfig('api-lambda', {
	functionArn: apiLambda.arn,
	retryAttempts: 1,
})

stack.add(apiEventInvoke)

const dataSourceRole = new aws.iam.Role('datasource', {
	assumedBy: 'appsync.amazonaws.com',
})

dataSourceRole.addInlinePolicy({
	name: 'default',
	statements: [
		{
			actions: ['lambda:InvokeFunction'],
			resources: [apiLambda.arn],
		},
	],
})

api.add(dataSourceRole)

const dataSource = new aws.appsync.DataSource('test', {
	apiId: api.id,
	name: 'custom_lambda',
	type: 'lambda',
	functionArn: apiLambda.arn,
	role: dataSourceRole.arn,
})

api.add(dataSource)

const funcConfig = new aws.appsync.FunctionConfiguration('test', {
	name: 'custom_lambda',
	apiId: api.id,
	dataSourceName: dataSource.name,
	code: Asset.fromFile('./state-data/resolver.js'),
})

api.add(funcConfig)

const resolver = new aws.appsync.Resolver('test', {
	apiId: api.id,
	typeName: 'Query',
	fieldName: 'test',
	code: Asset.fromFile('./state-data/resolver.js'),
	functions: [funcConfig.id],
})

api.add(resolver)

// const dataSource = new aws.appsync.DataSource('none', {
// 	apiId: api.id,
// 	name: 'None',
// 	type: 'none',
// })

// const domainName = new aws.appsync.GraphQLSchema('test', {
// 	apiId: api.id,
// 	definition: Asset.fromString('type Query { test: Boolean }'),
// })

// stack.add(schema)

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
	await workspace.deleteStack(stack)
	// await workspace.deployStack(stack)

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
