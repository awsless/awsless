import { aws } from '@terraforge/aws'
import { Group, Output } from '@terraforge/core'
import { defineFeature } from '../../feature.js'

export const vpcFeature = defineFeature({
	name: 'vpc',
	onApp(ctx) {
		const group = new Group(ctx.base, 'vpc', 'main')

		// A VPC is always a dual ipv4 and ipv6 VPC
		// That's why we need to give it a ipv4 cidrBlock.

		const vpc = new aws.Vpc(group, 'vpc', {
			tags: {
				Name: ctx.app.name,
			},
			cidrBlock: '10.0.0.0/16',
			enableDnsSupport: true,
			enableDnsHostnames: true,
			ipv6CidrBlockNetworkBorderGroup: ctx.appConfig.region,
			assignGeneratedIpv6CidrBlock: true,
		})

		const privateRouteTable = new aws.route.Table(group, 'private', {
			vpcId: vpc.id,
			tags: {
				Name: 'private',
			},
		})

		const publicRouteTable = new aws.route.Table(group, 'public', {
			vpcId: vpc.id,
			tags: {
				Name: 'public',
			},
		})

		const gateway = new aws.internet.Gateway(group, 'gateway', {
			tags: {
				Name: ctx.app.name,
			},
		})

		const egressOnlyInternetGateway = new aws.egress.OnlyInternetGateway(group, 'gateway', {
			vpcId: vpc.id,
			tags: {
				Name: ctx.app.name,
			},
		})

		const attachment = new aws.internet.GatewayAttachment(group, 'attachment', {
			vpcId: vpc.id,
			internetGatewayId: gateway.id,
		})

		new aws.Route(group, 'ipv4', {
			routeTableId: publicRouteTable.id,
			destinationCidrBlock: '0.0.0.0/0',
			gatewayId: gateway.id,
		})

		new aws.Route(group, 'ipv6', {
			routeTableId: privateRouteTable.id,
			destinationIpv6CidrBlock: '::/0',
			egressOnlyGatewayId: egressOnlyInternetGateway.id,
		})

		ctx.shared.set(
			'vpc',
			'id',
			// Some resources require the internet gateway to be attached.
			$resolve([vpc.id, attachment.internetGatewayId], vpcId => vpcId)
		)

		ctx.shared.set('vpc', 'security-group-id', vpc.defaultSecurityGroupId)

		let block = 0n
		const zones = ['a', 'b', 'c']
		const tables = {
			private: privateRouteTable,
			public: publicRouteTable,
		}
		let ipv6Identifier = 0

		const subnetIdsByType: Record<'private' | 'public', Output<string>[]> = {
			private: [],
			public: [],
		}

		for (const [_type, table] of Object.entries(tables)) {
			const type = _type as 'private' | 'public'
			const subnetIds = subnetIdsByType[type]

			for (const [i, zone] of zones.entries()) {
				const index = i + 1
				const id = `${type}-${index}`
				const subnet = new aws.Subnet(group, id, {
					tags: {
						Name: `${ctx.app.name}--${type}-${index}`,
					},
					vpcId: vpc.id,
					cidrBlock: `10.0.${block}.0/20`,
					mapPublicIpOnLaunch: type === 'public',
					availabilityZone: ctx.appConfig.region + zone,
					ipv6CidrBlock: vpc.ipv6CidrBlock.pipe((value: string) => {
						const cidrParts = value.split('::')
						const cidrBlock = cidrParts[0]?.substring(0, cidrParts[0].length - 1)

						return `${cidrBlock}${ipv6Identifier++}::/64`
					}),
				})

				new aws.route.TableAssociation(group, id, {
					routeTableId: table.id,
					subnetId: subnet.id,
				})

				subnetIds.push(subnet.id)
				block += 16n
			}

			ctx.shared.set('vpc', `${type}-subnets`, subnetIds)
		}

		// The private subnets only have an ipv6 route to the internet.
		// A NAT gateway is needed to reach ipv4-only endpoints.

		const eip = new aws.Eip(group, 'nat', {
			domain: 'vpc',
			tags: {
				Name: ctx.app.name,
			},
		})

		const natGateway = new aws.nat.Gateway(
			group,
			'nat',
			{
				allocationId: eip.allocationId,
				subnetId: subnetIdsByType.public[0],
				tags: {
					Name: ctx.app.name,
				},
			},
			{
				// The internet gateway needs to be attached before
				// a NAT gateway can be created.
				dependsOn: [attachment],
			}
		)

		new aws.Route(group, 'nat-ipv4', {
			routeTableId: privateRouteTable.id,
			destinationCidrBlock: '0.0.0.0/0',
			natGatewayId: natGateway.id,
		})
	},
})
