import { ipv6CidrBlockFromString } from '@arcanyx/cidr-slicer'
import { aws, combine, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'

export const vpcFeature = defineFeature({
	name: 'vpc',
	onApp(ctx) {
		const group = new Node(ctx.base, 'vpc', 'main')

		// A VPC is always a dual ipv4 and ipv6 VPC
		// That's why we need to give it a ipv4 cidrBlock.

		const vpc = new aws.ec2.Vpc(group, 'vpc', {
			name: ctx.app.name,
			cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
			// cidrBlock: aws.ec2.Peer.ipv6('fd00:10:20::/48'),
			// cidrBlock: aws.ec2.Peer.ipv6('2a05:d018:c69:6600::/56'),
			// enableDnsSupport: true,
			// enableDnsHostnames: true,
		})

		const ipv6CidrBlock = new aws.ec2.VPCCidrBlock(group, 'ipv6', {
			vpcId: vpc.id,
			amazonProvidedIpv6CidrBlock: true,
		})

		const slices = ipv6CidrBlock.ipv6CidrBlock.apply(ip => {
			return ipv6CidrBlockFromString(ip).slice(64)
		})

		// ipv6CidrBlock.value.apply(console.log)

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
			// destination: aws.ec2.Peer.anyIpv4(),
			destination: aws.ec2.Peer.anyIpv6(),
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

		// slices.apply(list => {
		// 	console.log('\n')
		// 	console.log('1', list.get(0n).toString())
		// 	console.log('\n')
		// 	console.log('2', list.get(1n).toString())
		// 	console.log('\n')
		// })

		const zones = ['a', 'b']
		const tables = [privateRouteTable, publicRouteTable]
		let block = 0n

		for (const table of tables) {
			for (const i in zones) {
				const index = Number(i) + 1
				const id = `${table.identifier}-${index}`
				const subnet = new aws.ec2.Subnet(group, id, {
					name: `${ctx.app.name}--${table.identifier}-${index}`,
					vpcId: vpc.id,
					cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
					// ipv6CidrBlock: aws.ec2.Peer.ipv6(`fd00:10:20:${++block}::/64`),
					// ipv6CidrBlock: aws.ec2.Peer.ipv6(`2a05:d018:c69:660${++block}::/64`),
					// ipv6CidrBlock: ipv6CidrBlock.ipv6CidrBlock.apply(ip => ),
					ipv6CidrBlock: slices.apply(list => aws.ec2.Peer.ipv6(list.get(block++).toString())),
					assignIpv6AddressOnCreation: true,
					// ipv6Native: true,
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
