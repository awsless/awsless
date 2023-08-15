import { CfnGraphQLApi } from "aws-cdk-lib/aws-appsync";
import { AliasRecordTargetConfig, IAliasRecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

export class CfnGraphqlApiDomainTarget implements IAliasRecordTarget {
	constructor(private readonly api: CfnGraphQLApi) {}

	public bind(): AliasRecordTargetConfig {
		return {
			dnsName: this.api.attrGraphQlDns,
			hostedZoneId: CloudFrontTarget.getHostedZoneId(this.api),
		}
	}
}
