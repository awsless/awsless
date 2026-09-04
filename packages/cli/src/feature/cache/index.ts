import { toGibibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { Group, Input } from '@terraforge/core'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { cacheOnDev } from './dev.js'

const typeGenCode = `
import { RedisClient } from '@awsless/redis'

type RedisClientFactory = (db?: number) => RedisClient
`

export const cacheFeature = defineFeature({
	name: 'cache',
	onDev: cacheOnDev,
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			for (const name of Object.keys(stack.caches || {})) {
				resource.addType(name, `RedisClientFactory`)
			}

			resources.addType(stack.name, resource)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('CacheResources', resources)

		await ctx.write('cache.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.caches ?? {})) {
			const group = new Group(ctx.stack, 'cache', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'cache',
				resourceName: id,
				seperator: '-',
			})

			const securityGroup = new aws.security.Group(group, 'security', {
				name,
				vpcId: ctx.shared.get('vpc', 'id'),
				description: name,
			})

			// An all-empty limits block still counts as a change against a
			// cache without limits, and AWS rejects the resulting no-op
			// modify call, so only send the block when a limit is set.
			const dataStorage =
				props.minStorage || props.maxStorage
					? [
							{
								minimum: props.minStorage && toGibibytes(props.minStorage),
								maximum: props.maxStorage && toGibibytes(props.maxStorage),
								unit: 'GB' as const,
							},
						]
					: []

			const ecpuPerSecond =
				props.minECPU || props.maxECPU
					? [
							{
								minimum: props.minECPU,
								maximum: props.maxECPU,
							},
						]
					: []

			const cache = new aws.elasticache.ServerlessCache(
				group,
				'cache',
				{
					name,
					engine: 'valkey',
					dailySnapshotTime: '02:00',
					majorEngineVersion: '8',
					snapshotRetentionLimit: props.snapshotRetentionLimit,
					securityGroupIds: [securityGroup.id],
					subnetIds: ctx.shared.get('vpc', 'private-subnets'),
					cacheUsageLimits:
						dataStorage.length > 0 || ecpuPerSecond.length > 0
							? [{ dataStorage, ecpuPerSecond }]
							: undefined,
				},
				{
					retainOnDelete: ctx.appConfig.removal === 'retain',
					import: ctx.import ? name : undefined,
				}
			)

			const masterHost = cache.endpoint.pipe(v => v.at(0)!.address)
			const masterPort = cache.endpoint.pipe(v => v.at(0)!.port)
			const slaveHost = cache.readerEndpoint.pipe(v => v.at(0)!.address)
			const slavePort = cache.readerEndpoint.pipe(v => v.at(0)!.port)

			// Only the app's own workloads reach the cache: the lambdas share
			// the vpc security group, jobs & instances bring their own.
			const allowClient = (clientId: string, clientSecurityGroupId: Input<string>) => {
				for (const [endpoint, port] of [
					['master', masterPort],
					['slave', slavePort],
				] as const) {
					new aws.vpc.SecurityGroupIngressRule(group, `${endpoint}-rule-${clientId}`, {
						securityGroupId: securityGroup.id,
						description: port.pipe(port => `Allow ${clientId} on port: ${port}`),
						ipProtocol: 'tcp',
						referencedSecurityGroupId: clientSecurityGroupId,
						fromPort: port,
						toPort: port,
					})
				}
			}

			allowClient('lambda', ctx.shared.get('vpc', 'security-group-id'))

			// The instance security groups only exist once every stack has synthed.
			ctx.onReady(() => {
				if (ctx.shared.has('job', 'security-group-id')) {
					allowClient('job', ctx.shared.get('job', 'security-group-id'))
				}

				for (const instance of ctx.shared.list('instance', 'security-group-id')) {
					allowClient(instance.name, instance.id)
				}
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
