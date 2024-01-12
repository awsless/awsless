import { z } from 'zod'
import { definePlugin } from '../plugin.js'
import { ResourceIdSchema } from '../schema/resource-id.js'
import { Cluster } from '../formation/resource/memorydb/cluster.js'
import { SecurityGroup } from '../formation/resource/ec2/security-group.js'
import { SubnetGroup } from '../formation/resource/memorydb/subnet-group.js'
import { Peer } from '../formation/resource/ec2/peer.js'
import { Port } from '../formation/resource/ec2/port.js'
import { TypeGen, TypeObject } from '../util/type-gen.js'
import { constantCase } from 'change-case'

const TypeSchema = z.enum([
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
])

const PortSchema = z.number().int().min(1).max(50000)
const ShardsSchema = z.number().int().min(0).max(100)
const ReplicasPerShardSchema = z.number().int().min(0).max(5)
const EngineSchema = z.enum(['7.0', '6.2'])

const typeGenCode = `
import { Cluster, CommandOptions } from '@awsless/redis'

type Callback<T> = (redis: Cluster) => T

type Command = {
	readonly host: string
	readonly port: number
	<T>(callback: Callback<T>): T
	<T>(options:Omit<CommandOptions, 'cluster'>, callback: Callback<T>): T
}`

export const cachePlugin = definePlugin({
	name: 'cache',
	schema: z.object({
		stacks: z
			.object({
				/** Define the caches in your stack.
				 * For access to the cache put your functions inside the global VPC.
				 * @example
				 * {
				 *   caches: {
				 *     CACHE_NAME: {
				 *       type: 't4g.small'
				 *     }
				 *   }
				 * }
				 */
				caches: z
					.record(
						ResourceIdSchema,
						z.object({
							type: TypeSchema.default('t4g.small'),
							port: PortSchema.default(6379),
							shards: ShardsSchema.default(1),
							replicasPerShard: ReplicasPerShardSchema.default(1),
							engine: EngineSchema.default('7.0'),
							dataTiering: z.boolean().default(false),
						})
					)
					.optional(),
			})
			.array(),
	}),
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of config.stacks) {
			const resource = new TypeObject(2)
			for (const name of Object.keys(stack.caches || {})) {
				resource.addType(name, `Command`)
			}

			resources.addType(stack.name, resource)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('CacheResources', resources)

		await write('cache.d.ts', gen, true)
	},
	onStack({ config, stack, stackConfig, bootstrap, bind }) {
		for (const [id, props] of Object.entries(stackConfig.caches || {})) {
			const name = `${config.name}-${stack.name}-${id}`

			const subnetGroup = new SubnetGroup(id, {
				name,
				subnetIds: [bootstrap.import(`private-subnet-1`), bootstrap.import(`private-subnet-2`)],
			})

			const securityGroup = new SecurityGroup(id, {
				name,
				vpcId: bootstrap.import(`vpc-id`),
				description: name,
			})

			const port = Port.tcp(props.port)

			securityGroup.addIngressRule(Peer.anyIpv4(), port)
			securityGroup.addIngressRule(Peer.anyIpv6(), port)

			const cluster = new Cluster(id, {
				name,
				aclName: 'open-access',
				securityGroupIds: [securityGroup.id],
				subnetGroupName: subnetGroup.name,
				...props,
			}).dependsOn(subnetGroup, securityGroup)

			stack.add(subnetGroup, securityGroup, cluster)

			bind(lambda => {
				lambda
					// .setVpc({
					// 	securityGroupIds: [ securityGroup.id ],
					// 	subnetIds: [
					// 		bootstrap.import(`public-subnet-1`),
					// 		bootstrap.import(`public-subnet-2`),
					// 	]
					// })
					// .addPermissions({
					// 	actions: [
					// 		'ec2:CreateNetworkInterface',
					// 		'ec2:DescribeNetworkInterfaces',
					// 		'ec2:DeleteNetworkInterface',
					// 		'ec2:AssignPrivateIpAddresses',
					// 		'ec2:UnassignPrivateIpAddresses',
					// 	],
					// 	resources: [ '*' ],
					// })
					.addEnvironment(`CACHE_${constantCase(stack.name)}_${constantCase(id)}_HOST`, cluster.address)
					.addEnvironment(
						`CACHE_${constantCase(stack.name)}_${constantCase(id)}_PORT`,
						props.port.toString()
					)
				// .dependsOn(cluster)
			})
		}
	},
})
