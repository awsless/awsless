// import { ipv6CidrBlockFromString } from '@arcanyx/cidr-slicer'
import { Group, Output } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'

export const vpcFeature = defineFeature({
	name: 'vpc',
	onApp(ctx) {
		const group = new Group(ctx.base, 'vpc', 'main')

		// A VPC is always a dual ipv4 and ipv6 VPC
		// That's why we need to give it a ipv4 cidrBlock.

		// const vpc = aws.$default.Vpc(group, 'vpc', {
		// 	''
		// })

		const vpc = new aws.Vpc(group, 'vpc', {
			tags: {
				Name: ctx.app.name,
			},
			cidrBlock: '10.0.0.0/16',
			enableDnsSupport: true,
			enableDnsHostnames: true,
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

		const attachment = new aws.internet.GatewayAttachment(group, 'attachment', {
			vpcId: vpc.id,
			internetGatewayId: gateway.id,
		})

		new aws.Route(group, 'route', {
			gatewayId: gateway.id,
			routeTableId: publicRouteTable.id,
			destinationCidrBlock: '0.0.0.0/0',
		})

		ctx.shared.set(
			'vpc',
			'id',
			// Some resources require the internet gateway to be attached.
			$resolve([vpc.id, attachment.internetGatewayId], vpcId => vpcId)
		)

		ctx.shared.set('vpc', 'security-group-id', vpc.defaultSecurityGroupId)

		let block = 0n
		const zones = ['a', 'b']
		const tables = {
			private: privateRouteTable,
			public: publicRouteTable,
		}

		for (const [_type, table] of Object.entries(tables)) {
			const type = _type as 'private' | 'public'
			const subnetIds: Output<string>[] = []

			for (const i in zones) {
				const index = Number(i) + 1
				const id = `${type}-${index}`
				const subnet = new aws.Subnet(group, id, {
					tags: {
						Name: `${ctx.app.name}--${type}-${index}`,
					},
					vpcId: vpc.id,
					cidrBlock: `10.0.${block++}.0/24`,
					mapPublicIpOnLaunch: type === 'public',
					availabilityZone: ctx.appConfig.region + zones[i],
				})

				new aws.route.TableAssociation(group, id, {
					routeTableId: table.id,
					subnetId: subnet.id,
				})

				subnetIds.push(subnet.id)
			}

			ctx.shared.set('vpc', `${type}-subnets`, subnetIds)
		}
	},
})
