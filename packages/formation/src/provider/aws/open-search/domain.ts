import { Size, gibibytes, toGibibytes } from '@awsless/size'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'
import { capitalCase } from 'change-case'
import { Node } from '../../../core/node'

export type Version = '2.11' | '2.9' | '2.7' | '2.5' | '2.3' | '1.3'

export type NodeType =
	| 't3.small'
	| 't3.medium'
	| 't3.large'
	| 't3.xlarge'
	| 't3.2xlarge'
	| 't4g.small'
	| 't4g.medium'
	| 'm3.medium'
	| 'm3.large'
	| 'm3.xlarge'
	| 'm3.2xlarge'
	| 'm4.large'
	| 'm4.xlarge'
	| 'm4.2xlarge'
	| 'm4.4xlarge'
	| 'm4.10xlarge'
	| 'm5.large'
	| 'm5.xlarge'
	| 'm5.2xlarge'
	| 'm5.4xlarge'
	| 'm5.12xlarge'
	| 'm5.24xlarge'
	| 'r5.large'
	| 'r5.xlarge'
	| 'r5.2xlarge'
	| 'r5.4xlarge'
	| 'r5.12xlarge'
	| 'r5.24xlarge'
	| 'c5.large'
	| 'c5.xlarge'
	| 'c5.2xlarge'
	| 'c5.4xlarge'
	| 'c5.9xlarge'
	| 'c5.18xlarge'
	| 'or1.medium'
	| 'or1.large'
	| 'or1.xlarge'
	| 'or1.2xlarge'
	| 'or1.4xlarge'
	| 'or1.8xlarge'
	| 'or1.12xlarge'
	| 'or1.16xlarge'
	| 'ultrawarm1.medium'
	| 'ultrawarm1.large'
	| 'ultrawarm1.xlarge'
	| 'r3.large'
	| 'r3.xlarge'
	| 'r3.2xlarge'
	| 'r3.4xlarge'
	| 'r3.8xlarge'
	| 'i2.xlarge'
	| 'i2.2xlarge'
	| 'd2.xlarge'
	| 'd2.2xlarge'
	| 'd2.4xlarge'
	| 'd2.8xlarge'
	| 'c4.large'
	| 'c4.xlarge'
	| 'c4.2xlarge'
	| 'c4.4xlarge'
	| 'c4.8xlarge'
	| 'r4.large'
	| 'r4.xlarge'
	| 'r4.2xlarge'
	| 'r4.4xlarge'
	| 'r4.8xlarge'
	| 'r4.16xlarge'
	| 'i3.large'
	| 'i3.xlarge'
	| 'i3.2xlarge'
	| 'i3.4xlarge'
	| 'i3.8xlarge'
	| 'i3.16xlarge'
	| 'r6g.large'
	| 'r6g.xlarge'
	| 'r6g.2xlarge'
	| 'r6g.4xlarge'
	| 'r6g.8xlarge'
	| 'r6g.12xlarge'
	| 'm6g.large'
	| 'm6g.xlarge'
	| 'm6g.2xlarge'
	| 'm6g.4xlarge'
	| 'm6g.8xlarge'
	| 'm6g.12xlarge'
	| 'c6g.large'
	| 'c6g.xlarge'
	| 'c6g.2xlarge'
	| 'c6g.4xlarge'
	| 'c6g.8xlarge'
	| 'c6g.12xlarge'
	| 'r6gd.large'
	| 'r6gd.xlarge'
	| 'r6gd.2xlarge'
	| 'r6gd.4xlarge'
	| 'r6gd.8xlarge'
	| 'r6gd.12xlarge'
	| 'r6gd.16xlarge'

export class Domain extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name?: Input<string>
			instance: Input<{
				type: Input<NodeType>
				count: Input<number>
			}>
			version?: Input<Version>
			storageSize?: Input<Size>
			ipType?: Input<'ipv4' | 'dualstack'>
			encryption?: Input<boolean>
			vpc?: Input<{
				securityGroupIds: Input<Input<string>[]>
				subnetIds: Input<Input<string>[]>
			}>
			accessPolicy?: {
				version?: Input<'2012-10-17'>
				statements: Input<
					Input<{
						effect?: Input<'allow' | 'deny'>
						principal?: Input<string>
						actions?: Input<Input<string>[]>
						resources?: Input<Input<string>[]>
						sourceArn?: Input<ARN>
					}>[]
				>
			}
		}
	) {
		super(parent, 'AWS::OpenSearchService::Domain', id, props)
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
		const accessPolicy = unwrap(this.props.accessPolicy)

		return {
			document: {
				DomainName: this.props.name,
				EngineVersion: unwrap(`OpenSearch_${this.props.version}`, 'OpenSearch_2.11'),
				IPAddressType: unwrap(this.props.ipType, 'ipv4'),
				ClusterConfig: {
					InstanceType: `${instance.type}.search`,
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
							VPCOptions: {
								SecurityGroupIds: vpc.securityGroupIds,
								SubnetIds: vpc.subnetIds,
							},
					  }
					: {}),

				AccessPolicies: {
					Version: unwrap(accessPolicy?.version, '2012-10-17'),
					Statement: unwrap(accessPolicy?.statements, [])
						.map(s => unwrap(s))
						.map(statement => ({
							Effect: capitalCase(unwrap(statement.effect, 'allow')),
							Action: unwrap(statement.actions, ['es:*']),
							Resource: unwrap(statement.resources, ['*']),
							...(statement.principal
								? {
										Principal: {
											Service: statement.principal,
										},
								  }
								: {}),
							...(statement.sourceArn
								? {
										Condition: {
											StringEquals: {
												'AWS:SourceArn': statement.sourceArn,
											},
										},
								  }
								: {}),
						})),
				},
			},
		}
	}
}
