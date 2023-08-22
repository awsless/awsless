
import { Resource } from "../../resource";
import { formatName, getAtt } from "../../util";

export type NodeType = (
	't4g.small' |
	't4g.medium' |

	'r6g.large' |
	'r6g.xlarge' |
	'r6g.2xlarge' |
	'r6g.4xlarge' |
	'r6g.8xlarge' |
	'r6g.12xlarge' |
	'r6g.16xlarge' |

	'r6gd.xlarge' |
	'r6gd.2xlarge' |
	'r6gd.4xlarge' |
	'r6gd.8xlarge'
)

export class Cluster extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		aclName: string
		subnetGroupName?: string
		securityGroupIds?: string[]
		name?: string
		description?: string
		port?: number
		engine?: '6.2' | '7.0'
		type: NodeType
		dataTiering?: boolean
		shards?: number
		replicasPerShard?: number
		// tls?: boolean
		autoMinorVersionUpgrade?: boolean
		maintenanceWindow?: `${string}:${number}:${number}-${string}:${number}:${number}`
	}) {
		super('AWS::MemoryDB::Cluster', logicalId)
		this.name = formatName(this.props.name || logicalId)

		this.tag('name', this.name)
	}

	get status() {
		return getAtt(this.logicalId, 'Status')
	}

	get arn() {
		return getAtt(this.logicalId, 'ARN')
	}

	get address() {
		return getAtt(this.logicalId, 'ClusterEndpoint.Address')
	}

	get port() {
		return getAtt<number>(this.logicalId, 'ClusterEndpoint.Port')
	}

	properties() {
		return {
			ClusterName: this.name,
			ClusterEndpoint: {
				Port: this.props.port,
			},
			Port: this.props.port,
			...this.attr('Description', this.props.description),
			ACLName: this.props.aclName,
			EngineVersion: this.props.engine ?? '7.0',
			...this.attr('SubnetGroupName', this.props.subnetGroupName),
			...this.attr('SecurityGroupIds', this.props.securityGroupIds),
			NodeType: 'db.' + this.props.type,
			NumReplicasPerShard: this.props.replicasPerShard ?? 1,
			NumShards: this.props.shards ?? 1,
			TLSEnabled: true,
			DataTiering: this.props.dataTiering ? 'true' : 'false',
			AutoMinorVersionUpgrade: this.props.autoMinorVersionUpgrade ?? true,
			MaintenanceWindow: this.props.maintenanceWindow ?? 'Sat:02:00-Sat:05:00',
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
