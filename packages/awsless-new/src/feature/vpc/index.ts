import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'

export const vpcFeature = defineFeature({
	name: 'vpc',
	onApp(ctx) {
		const vpc = new aws.ec2.Vpc('vpc', {
			name: ctx.app.name,
			cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
		})

		const privateRouteTable = new aws.ec2.RouteTable('private', {
			vpcId: vpc.id,
			name: 'private',
		})

		const publicRouteTable = new aws.ec2.RouteTable('public', {
			vpcId: vpc.id,
			name: 'public',
		})

		const gateway = new aws.ec2.InternetGateway('gateway')
		const attachment = new aws.ec2.VPCGatewayAttachment('attachment', {
			vpcId: vpc.id,
			internetGatewayId: gateway.id,
		})

		const route = new aws.ec2.Route('route', {
			gatewayId: gateway.id,
			routeTableId: publicRouteTable.id,
			destination: aws.ec2.Peer.anyIpv4(),
		})

		ctx.base.export('vpc-id', vpc.id)
		ctx.base.export('vpc-security-group-id', vpc.defaultSecurityGroup)

		const group = new Node('vpc', 'main')

		group.add(vpc, privateRouteTable, publicRouteTable, gateway, attachment, route)

		ctx.base.add(group)

		const zones = ['a', 'b']
		const tables = [privateRouteTable, publicRouteTable]
		let block = 0

		for (const table of tables) {
			for (const i in zones) {
				const index = Number(i) + 1
				const id = `${table.identifier}-${index}`
				const subnet = new aws.ec2.Subnet(id, {
					vpcId: vpc.id,
					cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
					availabilityZone: ctx.appConfig.region + zones[i],
				})

				const association = new aws.ec2.SubnetRouteTableAssociation(id, {
					routeTableId: table.id,
					subnetId: subnet.id,
				})

				ctx.base.export(`vpc-${table.identifier}-subnet-id-${index}`, subnet.id)
				group.add(subnet, association)
			}
		}
	},
})
