import { definePlugin } from '../../feature.js'
import { Cluster } from '../../formation/resource/memorydb/cluster.js'
import { SecurityGroup } from '../../formation/resource/ec2/security-group.js'
import { SubnetGroup } from '../../formation/resource/memorydb/subnet-group.js'
import { Peer } from '../../formation/resource/ec2/peer.js'
import { Port } from '../../formation/resource/ec2/port.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { constantCase } from 'change-case'

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
			const name = `${config.app.name}-${stack.name}-${id}`

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
