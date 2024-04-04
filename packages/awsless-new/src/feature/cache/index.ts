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
			const group = new Node(this.name, id)
			ctx.stack.add(group)

			const name = formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, this.name, id, '-')

			const subnetGroup = new aws.memorydb.SubnetGroup(id, {
				name,
				subnetIds: [
					ctx.app.import<string>('base', 'vpc-private-subnet-id-1'),
					ctx.app.import<string>('base', 'vpc-private-subnet-id-2'),
				],
			})

			const securityGroup = new aws.ec2.SecurityGroup(id, {
				name,
				vpcId: ctx.app.import<string>('base', `vpc-id`),
				description: name,
			})

			const port = aws.ec2.Port.tcp(props.port)

			securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv4() })
			securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv6() })

			const cluster = new aws.memorydb.Cluster(id, {
				name,
				aclName: 'open-access',
				securityGroupIds: [securityGroup.id],
				subnetGroupName: subnetGroup.name,
				...props,
			})

			group.add(subnetGroup, securityGroup, cluster)

			ctx.onFunction(({ lambda }) => {
				lambda.addEnvironment(
					`CACHE_${constantCase(ctx.stack.name)}_${constantCase(id)}_HOST`,
					cluster.address
				)
				lambda.addEnvironment(
					`CACHE_${constantCase(ctx.stack.name)}_${constantCase(id)}_PORT`,
					props.port.toString()
				)

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
			})
		}
	},
})
