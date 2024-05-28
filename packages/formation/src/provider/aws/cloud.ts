import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { Duration } from '@awsless/duration'
import { CertificateProvider } from './acm/certificate-provider'
import { CertificateValidationProvider } from './acm/certificate-validation-provider'
import { IntegrationProvider, StageProvider } from './api-gateway-v2'
import { DataSourceProvider } from './appsync/data-source-provider'
import { GraphQLApiProvider } from './appsync/graphql-api-provider'
import { GraphQLSchemaProvider } from './appsync/graphql-schema-provider'
import { CloudControlApiProvider } from './cloud-control-api/provider'
import { InvalidateCacheProvider } from './cloud-front'
import { LambdaTriggersProvider } from './cognito/lambda-triggers-provider'
import { TableItemProvider } from './dynamodb/table-item-provider'
import { ImageProvider } from './ecr'
import { FunctionProvider } from './lambda/function-provider'
import { RecordSetProvider } from './route53/record-set-provider'
import { BucketObjectProvider } from './s3/bucket-object-provider'
import { BucketProvider } from './s3/bucket-provider'
import { SubscriptionProvider } from './sns/subscription-provider'

type ConfigProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	accountId: string
	region: string
	timeout?: Duration
}

export const createCloudProviders = (config: ConfigProps) => {
	const cloudControlApiProvider = new CloudControlApiProvider(config)
	return [
		//
		cloudControlApiProvider,
		new ImageProvider(config),
		new FunctionProvider({ ...config, cloudProvider: cloudControlApiProvider }),
		new BucketProvider({ ...config, cloudProvider: cloudControlApiProvider }),
		new BucketObjectProvider(config),
		new TableItemProvider(config),
		new RecordSetProvider(config),
		new CertificateProvider(config),
		new CertificateValidationProvider(config),
		new IntegrationProvider(config),
		new StageProvider(config),
		new GraphQLApiProvider(config),
		new GraphQLSchemaProvider(config),
		new DataSourceProvider(config),
		new SubscriptionProvider(config),
		new InvalidateCacheProvider(config),
		new LambdaTriggersProvider(config),
	]
}
