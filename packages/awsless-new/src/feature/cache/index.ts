import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { Node, aws } from '@awsless/formation'

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
			const group = new Node(ctx.stack, this.name, id)

			const name = formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, this.name, id, '-')

			const subnetGroup = new aws.memorydb.SubnetGroup(group, 'subnets', {
				name,
				subnetIds: [
					//
					ctx.shared.get('vpc-private-subnet-id-1'),
					ctx.shared.get('vpc-private-subnet-id-2'),
				],
			})

			const securityGroup = new aws.ec2.SecurityGroup(group, 'security', {
				name,
				vpcId: ctx.shared.get(`vpc-id`),
				description: name,
			})

			const port = aws.ec2.Port.tcp(props.port)

			securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv4() })
			securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv6() })

			const cluster = new aws.memorydb.Cluster(group, 'cluster', {
				name,
				aclName: 'open-access',
				securityGroupIds: [securityGroup.id],
				subnetGroupName: subnetGroup.name,
				...props,
			})

			ctx.onFunction(({ lambda }) => {
				const prefix = `CACHE_${constantCase(ctx.stack.name)}_${constantCase(id)}`
				lambda.addEnvironment(`${prefix}_HOST`, cluster.address)
				lambda.addEnvironment(`${prefix}_PORT`, props.port.toString())
			})
		}
	},
})
