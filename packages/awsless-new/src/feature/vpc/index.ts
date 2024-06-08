import { aws, combine, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'

export const vpcFeature = defineFeature({
	name: 'vpc',
	onApp(ctx) {
		const group = new Node(ctx.base, 'vpc', 'main')

		const vpc = new aws.ec2.Vpc(group, 'vpc', {
			name: ctx.app.name,
			cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
		})

		const privateRouteTable = new aws.ec2.RouteTable(group, 'private', {
			vpcId: vpc.id,
			name: 'private',
		})

		const publicRouteTable = new aws.ec2.RouteTable(group, 'public', {
			vpcId: vpc.id,
			name: 'public',
		})

		const gateway = new aws.ec2.InternetGateway(group, 'gateway')
		const attachment = new aws.ec2.VPCGatewayAttachment(group, 'attachment', {
			vpcId: vpc.id,
			internetGatewayId: gateway.id,
		})

		new aws.ec2.Route(group, 'route', {
			gatewayId: gateway.id,
			routeTableId: publicRouteTable.id,
			destination: aws.ec2.Peer.anyIpv4(),
		})

		// ctx.shared.

		ctx.shared.set(
			'vpc-id',
			// Some resources require the internet gateway to be attached.
			combine([vpc.id, attachment.internetGatewayId]).apply(([id]) => id)
		)

		ctx.shared.set('vpc-security-group-id', vpc.defaultSecurityGroup)

		// const group = new Node('vpc', 'main')

		// group.add(vpc, privateRouteTable, publicRouteTable, gateway, attachment, route)

		// ctx.base.add(group)

		const zones = ['a', 'b']
		const tables = [privateRouteTable, publicRouteTable]
		let block = 0

		for (const table of tables) {
			for (const i in zones) {
				const index = Number(i) + 1
				const id = `${table.identifier}-${index}`
				const subnet = new aws.ec2.Subnet(group, id, {
					vpcId: vpc.id,
					cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
					availabilityZone: ctx.appConfig.region + zones[i],
				})

				new aws.ec2.SubnetRouteTableAssociation(group, id, {
					routeTableId: table.id,
					subnetId: subnet.id,
				})

				ctx.shared.set(`vpc-${table.identifier}-subnet-id-${index}`, subnet.id)
			}
		}
	},
})
