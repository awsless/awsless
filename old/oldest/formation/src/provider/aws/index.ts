export * as acm from './acm'
export * as apiGatewayV2 from './api-gateway-v2'
export * as appsync from './appsync'
export * as autoScaling from './auto-scaling'
export * from './cloud'
export * as cloudControlApi from './cloud-control-api'
export * as cloudFront from './cloud-front'
export * as cloudWatch from './cloud-watch'
export * as cognito from './cognito'
export * as dynamodb from './dynamodb'
export * as ec2 from './ec2'
export * as ecr from './ecr'
export * as ecs from './ecs'
export * as elb from './elb'
export * as events from './events'
export * as iam from './iam'
export * as iot from './iot'
export * as ivs from './ivs'
export * as lambda from './lambda'
export * as memorydb from './memorydb'
export * as openSearch from './open-search'
export * as openSearchServerless from './open-search/serverless'
export * as route53 from './route53'
export * as s3 from './s3'
export * as ses from './ses'
export * as sns from './sns'
export * as sqs from './sqs'
export * from './types'

// import { CloudControlApiProvider } from './cloud-control-api/provider'
// import { Table } from './dynamodb/table'
// import { TableItem } from './dynamodb/table-item'
// import { TableItemProvider } from './dynamodb/table-item-provider'
// import { Peer } from './ec2/peer'
// import { Port } from './ec2/port'
// import { Rule } from './events/rule'
// import { Role } from './iam/role'
// import { TopicRule } from './iot/topic-rule'
// import { Function } from './lambda/function'
// import { Permission } from './lambda/permission'
// import { Url } from './lambda/url'
// import { Cluster } from './memorydb/cluster'
// import { SubnetGroup } from './memorydb/subnet-group'
// import { Collection } from './open-search-serverless/collection'
// import { HostedZone } from './route53/hosted-zone'
// import { RecordSet } from './route53/record-set'
// import { Bucket } from './s3/bucket'
// import { BucketObject } from './s3/bucket-object'
// import { BucketObjectProvider } from './s3/bucket-object-provider'
// import { BucketPolicy } from './s3/bucket-policy'
// import { StateProvider } from './s3/state-provider'
// import { Subscription } from './sns/subscription'
// import { Topic } from './sns/topic'
// import { Queue } from './sqs/queue'
// import { Vpc } from './ec2/vpc'
// import { RouteTable } from './ec2/route-table'
// import { InternetGateway } from './ec2/internet-gateway'
// import { VPCGatewayAttachment } from './ec2/vpc-gateway-attachment'
// import { Route } from './ec2/route'
// import { Subnet } from './ec2/subnet'
// import { SubnetRouteTableAssociation } from './ec2/subnet-route-table-association'
// import { SecurityGroup } from './ec2/security-group'
// import { SecurityGroupRule } from './ec2/__security-group-rule'
// import { LogGroup } from './cloud-watch/log-group'
// // import { Policy } from './iam/__policy'
// import { RolePolicy } from './iam/role-policy'
// import { UserPool, UserPoolEmail } from './cognito/user-pool'
// // import { UserPoolDomain } from './cognito/user-pool-domain'
// import { UserPoolClient } from './cognito/user-pool-client'
// import { EmailIdentity } from './ses/email-identity'
// import { ConfigurationSet } from './ses/configuration-set'
// import { Distribution } from './cloud-front/distribution'
// import { Certificate } from './acm/certificate'
// import { CertificateValidation } from './acm/certificate-validation'
// import { CachePolicy } from './cloud-front/cache-policy'
// import { OriginAccessControl } from './cloud-front/origin-access-control'
// import { OriginRequestPolicy } from './cloud-front/origin-request-policy'
// import { ResponseHeadersPolicy } from './cloud-front/response-headers-policy'
// import { GraphQLApi } from './appsync/graphql-api'
// import { GraphQLSchema } from './appsync/graphql-schema'
// import { DomainName } from './appsync/domain-name'
// import { DomainNameApiAssociation } from './appsync/domain-name-api-association'
// import { DataSource } from './appsync/data-source'
// import { Resolver } from './appsync/resolver'
// import { FunctionConfiguration } from './appsync/function-configuration'
// import { SourceApiAssociation } from './appsync/source-api-association'
// import { EventInvokeConfig } from './lambda/event-invoke-config'
// import { EventSourceMapping } from './lambda/event-source-mapping'
// import { DynamoDBStateProvider } from './dynamodb/state-provider'

// export const aws = {
// 	createCloudProviders,
// 	appsync: {
// 		GraphQLApi,
// 		GraphQLSchema,
// 		DomainName,
// 		DomainNameApiAssociation,
// 		DataSource,
// 		FunctionConfiguration,
// 		Resolver,
// 		SourceApiAssociation,
// 	},
// 	cloudControlApi: {
// 		Provider: CloudControlApiProvider,
// 	},
// 	cloudWatch: {
// 		LogGroup,
// 	},
// 	cloudFront: {
// 		Distribution,
// 		CachePolicy,
// 		OriginAccessControl,
// 		OriginRequestPolicy,
// 		ResponseHeadersPolicy,
// 	},
// 	acm: {
// 		Certificate,
// 		CertificateValidation,
// 	},
// 	s3: {
// 		Bucket,
// 		BucketPolicy,
// 		BucketObject,
// 		BucketObjectProvider,
// 		StateProvider,
// 	},
// 	dynamodb: {
// 		Table,
// 		TableItem,
// 		TableItemProvider,
// 		StateProvider: DynamoDBStateProvider,
// 	},
// 	sqs: {
// 		Queue,
// 	},
// 	sns: {
// 		Topic,
// 		Subscription,
// 	},
// 	lambda: {
// 		Permission,
// 		Function,
// 		Url,
// 		EventInvokeConfig,
// 		EventSourceMapping,
// 	},
// 	iam: {
// 		Role,
// 		RolePolicy,
// 	},
// 	iot: {
// 		TopicRule,
// 	},
// 	events: {
// 		Rule,
// 	},
// 	openSearchServerless: {
// 		Collection,
// 	},
// 	route53: {
// 		HostedZone,
// 		RecordSet,
// 		// RecordSetGroup,
// 	},
// 	memorydb: {
// 		Cluster,
// 		SubnetGroup,
// 	},
// 	cognito: {
// 		UserPool,
// 		UserPoolEmail,
// 		// UserPoolDomain,
// 		UserPoolClient,
// 	},
// 	ec2: {
// 		Peer,
// 		Port,
// 		SecurityGroup,
// 		SecurityGroupRule,
// 		Vpc,
// 		Route,
// 		RouteTable,
// 		InternetGateway,
// 		VPCGatewayAttachment,
// 		Subnet,
// 		SubnetRouteTableAssociation,
// 	},
// 	ses: {
// 		EmailIdentity,
// 		ConfigurationSet,
// 	},
// }
