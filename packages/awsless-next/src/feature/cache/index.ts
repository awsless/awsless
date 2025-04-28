import { $, Group } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { toGibibytes } from '@awsless/size'

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

			// ---------------------------------------------------------------
			// Trying to retain the cache will result in the whole VPC
			// not being able to be deleted.

			// const retain = ctx.appConfig.removal === 'retain'
			// ---------------------------------------------------------------

			const securityGroup = new $.aws.security.Group(group, 'security', {
				name,
				vpcId: ctx.shared.get('vpc', 'id'),
				description: name,
			})

			const cache = new $.aws.elasticache.ServerlessCache(group, 'cache', {
				name,
				engine: 'valkey',
				dailySnapshotTime: '02:00',
				majorEngineVersion: '8',
				snapshotRetentionLimit: props.snapshotRetentionLimit,
				securityGroupIds: [securityGroup.id],
				subnetIds: ctx.shared.get('vpc', 'private-subnets'),
				cacheUsageLimits: [
					{
						dataStorage:
							props.minStorage || props.maxStorage
								? [
										{
											minimum: props.minStorage && toGibibytes(props.minStorage),
											maximum: props.maxStorage && toGibibytes(props.maxStorage),
											unit: 'GB',
										},
									]
								: [],
						ecpuPerSecond:
							props.minECPU || props.maxECPU
								? [
										{
											minimum: props.minECPU,
											maximum: props.maxECPU,
										},
									]
								: [],
					},
				],
			})

			// ---------------------------------------------------------------
			// Open up the SecurityGroup for ipv4 & ipv6 for the master node

			const masterHost = cache.endpoint.pipe(v => v.at(0)!.address)
			const masterPort = cache.endpoint.pipe(v => v.at(0)!.port)

			new $.aws.vpc.SecurityGroupIngressRule(group, 'master-rule-ip-v4', {
				securityGroupId: securityGroup.id,
				description: masterPort.pipe(port => `Allow ipv4 on port: ${port}`),
				ipProtocol: 'tcp',
				cidrIpv4: '0.0.0.0/0',
				fromPort: masterPort,
				toPort: masterPort,
			})

			new $.aws.vpc.SecurityGroupIngressRule(group, 'master-rule-ip-v6', {
				securityGroupId: securityGroup.id,
				description: masterPort.pipe(port => `Allow ipv6 on port: ${port}`),
				ipProtocol: 'tcp',
				cidrIpv6: '::/0',
				fromPort: masterPort,
				toPort: masterPort,
			})

			// ---------------------------------------------------------------
			// Open up the SecurityGroup for ipv4 & ipv6 for the slave reader

			const slaveHost = cache.readerEndpoint.pipe(v => v.at(0)!.address)
			const slavePort = cache.readerEndpoint.pipe(v => v.at(0)!.port)

			new $.aws.vpc.SecurityGroupIngressRule(group, 'slave-rule-ip-v4', {
				securityGroupId: securityGroup.id,
				description: slavePort.pipe(port => `Allow ipv4 on port: ${port}`),
				ipProtocol: 'tcp',
				cidrIpv4: '0.0.0.0/0',
				fromPort: slavePort,
				toPort: slavePort,
			})

			new $.aws.vpc.SecurityGroupIngressRule(group, 'slave-rule-ip-v6', {
				securityGroupId: securityGroup.id,
				description: slavePort.pipe(port => `Allow ipv6 on port: ${port}`),
				ipProtocol: 'tcp',
				cidrIpv6: '::/0',
				fromPort: slavePort,
				toPort: slavePort,
			})

			// ---------------------------------------------------------------

			const prefix = `CACHE_${constantCase(ctx.stack.name)}_${constantCase(id)}`

			ctx.addEnv(`${prefix}_HOST`, masterHost)
			ctx.addEnv(
				`${prefix}_PORT`,
				masterPort.pipe(p => p.toString())
			)

			ctx.addEnv(`${prefix}_SLAVE_HOST`, slaveHost)
			ctx.addEnv(
				`${prefix}_SLAVE_PORT`,
				slavePort.pipe(p => p.toString())
			)
		}
	},
})
