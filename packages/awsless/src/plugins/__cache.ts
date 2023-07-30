
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { toId, toName } from '../util/resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { CfnCluster, CfnACL, CfnUser, CfnSubnetGroup } from 'aws-cdk-lib/aws-memorydb';

export const pubsubPlugin = definePlugin({
	name: 'pubsub',
	schema: z.object({
		stacks: z.object({
			caches: z.record(ResourceIdSchema, z.object({
				type: z.enum([
					't4g.small',
					't4g.medium',

					'r6g.large',
					'r6g.xlarge',
					'r6g.2xlarge',
					'r6g.4xlarge',
					'r6g.8xlarge',
					'r6g.12xlarge',
					'r6g.16xlarge',

					'r6gd.xlarge',
					'r6gd.2xlarge',
					'r6gd.4xlarge',
					'r6gd.8xlarge',
				]).default('t4g.small'),
				shards: z.number().int().min(0).max(100).default(1),
				replicasPerShard: z.number().int().min(0).max(5).default(1),
				engine: z.enum(['7.0', '6.2']).default('7.0'),
				dataTiering: z.boolean().default(false),
			})).optional()
		}).array()
	}),
	onStack(ctx) {
		const { stack, stackConfig } = ctx

		// CfnACL
		// CfnUser
		// CfnSubnetGroup

		Object.entries(stackConfig.caches || {}).forEach(([ id, props ]) => {

			const aclName = toName(stack, id)
			const subnetGroupName = toName(stack, id)

			new CfnSubnetGroup(stack, toId('cache-subnet-group', id), {
				subnetGroupName,
				subnetIds: [

				]
			})

			new CfnUser(stack, toId('cache-user', id), {
				userName: 'admin',
				accessString: 'on ~* &* +@all',
				authenticationMode: {
					password: 'admin',
				}
			})

			new CfnACL(stack, toId('cache-acl', id), {
				aclName,
				userNames: [ 'admin' ]
			})

			new CfnCluster(stack, toId('cache', id), {
				clusterName: toName(stack, id),
				aclName,

				nodeType: props.type,
				numReplicasPerShard: props.replicasPerShard,
				numShards: props.shards,

				dataTiering: props.dataTiering ? 'true' : undefined,
				engineVersion: props.engine,
				maintenanceWindow: 'zat:02:00-zat:04:00',
				autoMinorVersionUpgrade: true,

				subnetGroupName,
				securityGroupIds: [''],
			})
		})
	},
})
