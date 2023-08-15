import { Region } from "../schema/region";
import { Function } from "./resource/lambda/function";
import { Resource } from "./resource";
import { Topic } from "./resource/sns/topic";
import { formatName } from "./util";
import { Duration } from "./property/duration";
import { Size } from "./property/size";
import { Queue } from "./resource/sqs/queue";
import { Bucket } from "./resource/s3/bucket";
import { Table } from "./resource/dynamodb/table";
import { GraphQLApi } from "./resource/appsync/graphql-api";
import { RecordSet } from "./resource/route53/record-set";
import { HostedZone } from "./resource/route53/hosted-zone";
import { Certificate } from "./resource/certificate-manager/certificate";
import { SecurityGroup } from "./resource/ec2/security-group";
import { Vpc } from "./resource/ec2/vpc";
import { Peer } from "./property/peer";
import { Port } from "./property/port";

export class Stack {
	private outputs:Record<string, string> = {}
	private resources = new Set<Resource>()

	constructor(readonly name: string, readonly region:Region) {}

	add(...resources: Resource[]) {
		resources.forEach(resource => this.resources.add(resource))
		return this
	}

	export(name: string, value: string) {
		this.outputs[name] = value
		return this
	}

	formatResourceName(name: string) {
		return formatName(this.name + '-' + name)
	}

	template() {
		return {
			Resources: [ ...this.resources ].map(resource => resource.template(this)),
			Outputs: Object.entries(this.outputs).map(([ name, value ]) => ({
				Export: { Name: name },
				Value: value,
			})),
		}
	}

	toJSON() {
		return JSON.stringify(this.template())
	}
}

const stack = new Stack('round', 'eu-west-1')
stack.export('name', '1')
stack.export('name', '2')

const table = new Table('table', {
	hash: 'id',
	fields: {
		id: 'string',
	}
})

const bucket = new Bucket('bucket')
const queue = new Queue('queue')
const topic = new Topic('topic')
const lambda = new Function('add', {
	file: '',
	timeout: Duration.seconds(10),
	memorySize: Size.megaBytes(512),
})

lambda.addEnvironment('test', 'test')
lambda.addPermissions(
	queue.permissions,
	bucket.permissions,
	table.permissions,
	// topic.permissions,
)

const certificate = new Certificate('domain.com')

const api = new GraphQLApi('api', {
	schema: []
})

api.attachDomainName('domain.com', certificate.arn)
api.addLambdaAuthProvider(lambda.arn)

const hostedZone = new HostedZone('zone')

const record = new RecordSet('record', {
	hostedZoneId: hostedZone.id,
	type: 'A',
	name: 'test',
	alias: api.dns,
})

const vpc = new Vpc('vpc', {
	availabilityZones: [ '' ]
})

const securityGroup = new SecurityGroup('group', {
	vpcId: vpc.id,
})

securityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(443))
securityGroup.addEgressRule(Peer.anyIpv6(), Port.tcp(443))

stack.add(table, bucket, queue, topic, lambda, api, hostedZone, record, securityGroup)
