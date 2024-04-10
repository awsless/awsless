import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudControlApiProvider } from './cloud-control-api/provider'
import { BucketObjectProvider } from './s3/bucket-object-provider'
import { TableItemProvider } from './dynamodb/table-item-provider'
import { RecordSetProvider } from './route53/record-set-provider'
import { BucketProvider } from './s3/bucket-provider'
import { CertificateProvider } from './acm/certificate-provider'
import { CertificateValidationProvider } from './acm/certificate-validation-provider'
import { GraphQLApiProvider } from './appsync/graphql-api-provider'
import { GraphQLSchemaProvider } from './appsync/graphql-schema-provider'
import { DataSourceProvider } from './appsync/data-source-provider'
import { Duration } from '@awsless/duration'
import { SubscriptionProvider } from './sns/subscription-provider'
import { InvalidateCacheProvider } from './cloud-front'
import { LambdaTriggersProvider } from './cognito/lambda-triggers-provider'

type ConfigProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	timeout?: Duration
}

export const createCloudProviders = (config: ConfigProps) => {
	const cloudControlApiProvider = new CloudControlApiProvider(config)
	return [
		//
		cloudControlApiProvider,
		new BucketProvider({ ...config, cloudProvider: cloudControlApiProvider }),
		new BucketObjectProvider(config),
		new TableItemProvider(config),
		new RecordSetProvider(config),
		new CertificateProvider(config),
		new CertificateValidationProvider(config),
		new GraphQLApiProvider(config),
		new GraphQLSchemaProvider(config),
		new DataSourceProvider(config),
		new SubscriptionProvider(config),
		new InvalidateCacheProvider(config),
		new LambdaTriggersProvider(config),
	]
}
