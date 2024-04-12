import { Size, gibibytes, toGibibytes } from '@awsless/size'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'

export type version =
	| 'OpenSearch_2.11'
	| 'OpenSearch_2.9'
	| 'OpenSearch_2.7'
	| 'OpenSearch_2.5'
	| 'OpenSearch_2.3'
	| 'OpenSearch_1.3'

export type NodeType =
	| 't3.small.search'
	| 't3.medium.search'
	| 't3.large.search'
	| 't3.xlarge.search'
	| 't3.2xlarge.search'
	| 't4g.small.search'
	| 't4g.medium.search'
	| 'm3.medium.search'
	| 'm3.large.search'
	| 'm3.xlarge.search'
	| 'm3.2xlarge.search'
	| 'm4.large.search'
	| 'm4.xlarge.search'
	| 'm4.2xlarge.search'
	| 'm4.4xlarge.search'
	| 'm4.10xlarge.search'
	| 'm5.large.search'
	| 'm5.xlarge.search'
	| 'm5.2xlarge.search'
	| 'm5.4xlarge.search'
	| 'm5.12xlarge.search'
	| 'm5.24xlarge.search'
	| 'r5.large.search'
	| 'r5.xlarge.search'
	| 'r5.2xlarge.search'
	| 'r5.4xlarge.search'
	| 'r5.12xlarge.search'
	| 'r5.24xlarge.search'
	| 'c5.large.search'
	| 'c5.xlarge.search'
	| 'c5.2xlarge.search'
	| 'c5.4xlarge.search'
	| 'c5.9xlarge.search'
	| 'c5.18xlarge.search'
	| 'or1.medium.search'
	| 'or1.large.search'
	| 'or1.xlarge.search'
	| 'or1.2xlarge.search'
	| 'or1.4xlarge.search'
	| 'or1.8xlarge.search'
	| 'or1.12xlarge.search'
	| 'or1.16xlarge.search'
	| 'ultrawarm1.medium.search'
	| 'ultrawarm1.large.search'
	| 'ultrawarm1.xlarge.search'
	| 'r3.large.search'
	| 'r3.xlarge.search'
	| 'r3.2xlarge.search'
	| 'r3.4xlarge.search'
	| 'r3.8xlarge.search'
	| 'i2.xlarge.search'
	| 'i2.2xlarge.search'
	| 'd2.xlarge.search'
	| 'd2.2xlarge.search'
	| 'd2.4xlarge.search'
	| 'd2.8xlarge.search'
	| 'c4.large.search'
	| 'c4.xlarge.search'
	| 'c4.2xlarge.search'
	| 'c4.4xlarge.search'
	| 'c4.8xlarge.search'
	| 'r4.large.search'
	| 'r4.xlarge.search'
	| 'r4.2xlarge.search'
	| 'r4.4xlarge.search'
	| 'r4.8xlarge.search'
	| 'r4.16xlarge.search'
	| 'i3.large.search'
	| 'i3.xlarge.search'
	| 'i3.2xlarge.search'
	| 'i3.4xlarge.search'
	| 'i3.8xlarge.search'
	| 'i3.16xlarge.search'
	| 'r6g.large.search'
	| 'r6g.xlarge.search'
	| 'r6g.2xlarge.search'
	| 'r6g.4xlarge.search'
	| 'r6g.8xlarge.search'
	| 'r6g.12xlarge.search'
	| 'm6g.large.search'
	| 'm6g.xlarge.search'
	| 'm6g.2xlarge.search'
	| 'm6g.4xlarge.search'
	| 'm6g.8xlarge.search'
	| 'm6g.12xlarge.search'
	| 'c6g.large.search'
	| 'c6g.xlarge.search'
	| 'c6g.2xlarge.search'
	| 'c6g.4xlarge.search'
	| 'c6g.8xlarge.search'
	| 'c6g.12xlarge.search'
	| 'r6gd.large.search'
	| 'r6gd.xlarge.search'
	| 'r6gd.2xlarge.search'
	| 'r6gd.4xlarge.search'
	| 'r6gd.8xlarge.search'
	| 'r6gd.12xlarge.search'
	| 'r6gd.16xlarge.search'

export class Domain extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name?: Input<string>
			instance: Input<{
				type: Input<NodeType>
				count: Input<number>
			}>
			version?: Input<version>
			storageSize?: Input<Size>
			ipType?: Input<'ipv4' | 'dualstack'>
			encryption?: Input<boolean>
			vpc?: Input<{
				securityGroupIds: Input<Input<string>[]>
				subnetIds: Input<Input<string>[]>
			}>
		}
	) {
		super('AWS::OpenSearchService::Domain', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get domainArn() {
		return this.output<ARN>(v => v.DomainArn)
	}

	get domainEndpoint() {
		return this.output<string>(v => v.DomainEndpoint)
	}

	setVpc(
		vpc: Input<{
			securityGroupIds: Input<Input<string>[]>
			subnetIds: Input<Input<string>[]>
		}>
	) {
		this.props.vpc = vpc
		this.registerDependency(vpc)

		return this
	}

	toState() {
		const instance = unwrap(this.props.instance)
		const vpc = unwrap(this.props.vpc)

		return {
			document: {
				DomainName: this.props.name,
				EngineVersion: unwrap(this.props.version, 'OpenSearch_2.11'),
				IPAddressType: unwrap(this.props.ipType, 'ipv4'),
				ClusterConfig: {
					InstanceType: instance.type,
					InstanceCount: instance.count,
				},
				EBSOptions: {
					EBSEnabled: true,
					VolumeSize: toGibibytes(unwrap(this.props.storageSize, gibibytes(10))),
					VolumeType: 'gp2',
				},
				DomainEndpointOptions: {
					EnforceHTTPS: true,
				},
				AccessPolicies: {
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Principal: {
								Service: 'es.amazonaws.com',
							},
							Action: 'es:*',
							Resource: '*',
						},
					],
				},
				SoftwareUpdateOptions: {
					AutoSoftwareUpdateEnabled: true,
				},
				NodeToNodeEncryptionOptions: {
					Enabled: unwrap(this.props.encryption, false),
				},
				EncryptionAtRestOptions: {
					Enabled: unwrap(this.props.encryption, false),
				},
				...(vpc
					? {
							VpcConfig: {
								SecurityGroupIds: vpc.securityGroupIds,
								SubnetIds: vpc.subnetIds,
							},
					  }
					: {}),
			},
		}
	}
}
