import { createCloudProviders } from './cloud'
import { CloudControlApiProvider } from './cloud-control-api/provider'
import { Table } from './dynamodb/table'
import { TableItem } from './dynamodb/table-item'
import { TableItemProvider } from './dynamodb/table-item-provider'
import { Peer } from './ec2/peer'
import { Port } from './ec2/port'
import { Rule } from './events/rule'
import { Role } from './iam/role'
import { TopicRule } from './iot/topic-rule'
import { Function } from './lambda/function'
import { Permission } from './lambda/permission'
import { Url } from './lambda/url'
import { Cluster } from './memorydb/cluster'
import { SubnetGroup } from './memorydb/subnet-group'
import { Collection } from './open-search-serverless/collection'
import { HostedZone } from './route53/hosted-zone'
import { RecordSet } from './route53/record-set'
import { Bucket } from './s3/bucket'
import { BucketObject } from './s3/bucket-object'
import { BucketObjectProvider } from './s3/bucket-object-provider'
import { BucketPolicy } from './s3/bucket-policy'
import { StateProvider } from './s3/state-provider'
import { Subscription } from './sns/subscription'
import { Topic } from './sns/topic'
import { Queue } from './sqs/queue'
import { Vpc } from './ec2/vpc'
import { RouteTable } from './ec2/route-table'
import { InternetGateway } from './ec2/internet-gateway'
import { VPCGatewayAttachment } from './ec2/vpc-gateway-attachment'
import { Route } from './ec2/route'
import { Subnet } from './ec2/subnet'
import { SubnetRouteTableAssociation } from './ec2/subnet-route-table-association'
import { SecurityGroup } from './ec2/security-group'
import { SecurityGroupRule } from './ec2/__security-group-rule'
import { LogGroup } from './cloud-watch/log-group'
// import { Policy } from './iam/__policy'
import { RolePolicy } from './iam/role-policy'
import { UserPool, UserPoolEmail } from './cognito/user-pool'
// import { UserPoolDomain } from './cognito/user-pool-domain'
import { UserPoolClient } from './cognito/user-pool-client'
import { EmailIdentity } from './ses/email-identity'
import { ConfigurationSet } from './ses/configuration-set'
import { Distribution } from './cloud-front/distribution'
import { Certificate } from './acm/certificate'
import { CertificateValidation } from './acm/certificate-validation'

export const aws = {
	createCloudProviders,
	cloudControlApi: {
		Provider: CloudControlApiProvider,
	},
	cloudWatch: {
		LogGroup,
	},
	cloudFront: {
		Distribution,
	},
	acm: {
		Certificate,
		CertificateValidation,
	},
	s3: {
		Bucket,
		BucketPolicy,
		BucketObject,
		BucketObjectProvider,
		StateProvider,
	},
	dynamodb: {
		Table,
		TableItem,
		TableItemProvider,
	},
	sqs: {
		Queue,
	},
	sns: {
		Topic,
		Subscription,
	},
	lambda: {
		Permission,
		Function,
		Url,
	},
	iam: {
		Role,
		RolePolicy,
	},
	iot: {
		TopicRule,
	},
	events: {
		Rule,
	},
	openSearchServerless: {
		Collection,
	},
	route53: {
		HostedZone,
		RecordSet,
		// RecordSetGroup,
	},
	memorydb: {
		Cluster,
		SubnetGroup,
	},
	cognito: {
		UserPool,
		UserPoolEmail,
		// UserPoolDomain,
		UserPoolClient,
	},
	ec2: {
		Peer,
		Port,
		SecurityGroup,
		SecurityGroupRule,
		Vpc,
		Route,
		RouteTable,
		InternetGateway,
		VPCGatewayAttachment,
		Subnet,
		SubnetRouteTableAssociation,
	},
	ses: {
		EmailIdentity,
		ConfigurationSet,
	},
}
