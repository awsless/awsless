import { $, Group } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'

const typeGenCode = `
import { Cluster, CommandOptions } from '@awsless/redis'

type Callback<T> = (redis: Cluster) => T

type Command = {
	readonly host: string
	readonly port: number
	<T>(callback: Callback<T>): T
	<T>(options:Omit<CommandOptions, 'cluster'>, callback: Callback<T>): T
}`

export const cacheFeature = defineFeature({
	name: 'cache',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			for (const name of Object.keys(stack.caches || {})) {
				resource.addType(name, `Command`)
			}

			resources.addType(stack.name, resource)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('CacheResources', resources)

		await ctx.write('cache.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.caches ?? {})) {
			const group = new Group(ctx.stack, this.name, id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'cache',
				resourceName: id,
				seperator: '-',
			})

			// Trying to retain the cache will result in the whole VPC
			// not being able to be deleted.

			// const retain = ctx.appConfig.removal === 'retain'

			const subnetGroup = new $.aws.memorydb.SubnetGroup(
				group,
				'subnets',
				{
					name,
					subnetIds: ctx.shared.get('vpc', 'private-subnets'),
				},
				{
					// retainOnDelete: retain,
					// import: ctx.import ? name : undefined,
				}
			)

			const securityGroup = new $.aws.security.Group(
				group,
				'security',
				{
					name,
					vpcId: ctx.shared.get('vpc', 'id'),
					description: name,
				},
				{
					// retainOnDelete: retain,
					// import: ctx.import ? name : undefined,
				}
			)

			new $.aws.vpc.SecurityGroupIngressRule(group, 'rule-ip-v4', {
				securityGroupId: securityGroup.id,
				description: `Allow ipv4 on port: ${props.port}`,
				ipProtocol: 'tcp',
				cidrIpv4: '0.0.0.0/0',
				fromPort: props.port,
				toPort: props.port,
			})

			new $.aws.vpc.SecurityGroupIngressRule(group, 'rule-ip-v6', {
				securityGroupId: securityGroup.id,
				description: `Allow ipv6 on port: ${props.port}`,
				ipProtocol: 'tcp',
				cidrIpv6: '::/0',
				fromPort: props.port,
				toPort: props.port,
			})

			const cluster = new $.aws.memorydb.Cluster(
				group,
				'cluster',
				{
					name,
					aclName: 'open-access',
					nodeType: `db.${props.type}`,
					engine: 'valkey',
					engineVersion: props.engineVersion,
					port: props.port,
					securityGroupIds: [securityGroup.id],
					subnetGroupName: subnetGroup.name,
					dataTiering: props.dataTiering,
					numReplicasPerShard: props.replicasPerShard,
					numShards: props.shards,
				},
				{
					// retainOnDelete: retain,
					// import: ctx.import ? name : undefined,
				}
			)

			const prefix = `CACHE_${constantCase(ctx.stack.name)}_${constantCase(id)}`
			const host = cluster.clusterEndpoint.pipe(v => v[0]!.address)
			ctx.addEnv(`${prefix}_HOST`, host)
			ctx.addEnv(`${prefix}_PORT`, props.port.toString())
		}
	},
})
