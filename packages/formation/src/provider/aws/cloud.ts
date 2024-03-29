import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudControlApiProvider } from './cloud-control-api/provider'
import { BucketObjectProvider } from './s3/bucket-object-provider'
import { TableItemProvider } from './dynamodb/table-item-provider'
import { RecordSetProvider } from './route53/record-set-provider'
import { BucketProvider } from './s3/bucket-provider'
import { CertificateProvider } from './acm/certificate-provider'
import { CertificateValidationProvider } from './acm/certificate-validation-provider'
// import { SecurityGroupProvider } from './ec2/__security-group-provider'
// import { SecurityGroupRuleProvider } from './ec2/__security-group-rule-provider'
// import { PolicyProvider } from './iam/policy-provider'

type ConfigProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

export const createCloudProviders = (config: ConfigProps) => {
	const cloudControlApiProvider = new CloudControlApiProvider(config)
	return [
		//
		cloudControlApiProvider,
		// new SecurityGroupProvider(config),
		// new SecurityGroupRuleProvider(config),
		new BucketProvider({ ...config, cloudProvider: cloudControlApiProvider }),
		new BucketObjectProvider(config),
		new TableItemProvider(config),
		new RecordSetProvider(config),
		new CertificateProvider({ ...config }),
		new CertificateValidationProvider({ ...config }),
		// new PolicyProvider(config),
	]
}
