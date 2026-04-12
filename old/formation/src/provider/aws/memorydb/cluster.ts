import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'
import { formatTags } from '../util'

export type NodeType =
	| 't4g.small'
	| 't4g.medium'
	| 'r6g.large'
	| 'r6g.xlarge'
	| 'r6g.2xlarge'
	| 'r6g.4xlarge'
	| 'r6g.8xlarge'
	| 'r6g.12xlarge'
	| 'r6g.16xlarge'
	| 'r6gd.xlarge'
	| 'r6gd.2xlarge'
	| 'r6gd.4xlarge'
	| 'r6gd.8xlarge'

export class Cluster extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			aclName: Input<string>
			tags?: Record<string, Input<string>>
			subnetGroupName?: Input<string>
			securityGroupIds?: Input<Input<string>[]>
			name: Input<string>
			description?: Input<string>
			port?: Input<number>
			engine?: Input<'6.2' | '7.0'>
			type: Input<NodeType>
			dataTiering?: Input<boolean>
			shards?: Input<number>
			replicasPerShard?: Input<number>
			tls?: Input<boolean>
			autoMinorVersionUpgrade?: Input<boolean>
			maintenanceWindow?: Input<`${string}:${number}:${number}-${string}:${number}:${number}`>
		}
	) {
		super(parent, 'AWS::MemoryDB::Cluster', id, props)
	}

	// get status() {
	// 	return this.output<string>(v => v.Status)
	// }

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get address() {
		return this.output<string>(v => v.ClusterEndpoint.Address)
	}

	get port() {
		return this.output<number>(v => v.ClusterEndpoint.Port)
	}

	toState() {
		return {
			document: {
				ClusterName: this.props.name,
				ClusterEndpoint: {
					Port: this.props.port,
				},
				Port: this.props.port,
				Tags: formatTags(this.tags),
				...this.attr('Description', this.props.description),
				ACLName: this.props.aclName,
				EngineVersion: unwrap(this.props.engine, '7.0'),
				...this.attr('SubnetGroupName', this.props.subnetGroupName),
				...this.attr('SecurityGroupIds', this.props.securityGroupIds),
				NodeType: 'db.' + unwrap(this.props.type),
				NumReplicasPerShard: unwrap(this.props.replicasPerShard, 1),
				NumShards: unwrap(this.props.shards, 1),
				TLSEnabled: unwrap(this.props.tls, false),
				DataTiering: unwrap(this.props.dataTiering) ? 'true' : 'false',
				AutoMinorVersionUpgrade: unwrap(this.props.autoMinorVersionUpgrade, true),
				MaintenanceWindow: unwrap(this.props.maintenanceWindow, 'Sat:02:00-Sat:05:00'),
			},
		}
	}
}

// ACLName: String
//   AutoMinorVersionUpgrade: Boolean
//   ClusterEndpoint:
//     Endpoint
//   DataTiering: String
//   FinalSnapshotName: String
//   ParameterGroupName: String
//   Port: Integer
//   SecurityGroupIds:
//     - String
//   SnapshotArns:
//     - String
//   SnapshotName: String
//   SnapshotRetentionLimit: Integer
//   SnapshotWindow: String
//   SnsTopicArn: String
//   SnsTopicStatus: String
//   SubnetGroupName: String
//   Tags:
//     - Tag
//   TLSEnabled: Boolean
