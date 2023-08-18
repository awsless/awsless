
// import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { InternetGateway, Route, RouteTable, Subnet, SubnetRouteTableAssociation, VPCGatewayAttachment, Vpc } from '../formation/resource/ec2/vpc.js';
import { Peer } from '../formation/resource/ec2/peer.js';

export const vpcPlugin = definePlugin({
	name: 'vpc',
	// schema: z.object({
	// 	defaults: z.object({
	// 		vpc: z.boolean().default(false),
	// 	}).default({}),
	// }),
	onApp({ config, bootstrap }) {

		const vpc = new Vpc('main', {
			cidrBlock: Peer.ipv4('10.0.0.0/16')
		})

		const privateRouteTable = new RouteTable('private', {
			vpcId: vpc.id,
			name: 'private',
		}).dependsOn(vpc)

		const publicRouteTable = new RouteTable('public', {
			vpcId: vpc.id,
			name: 'public',
		}).dependsOn(vpc)

		const gateway = new InternetGateway('')
		const attachment = new VPCGatewayAttachment('', {
			vpcId: vpc.id,
			internetGatewayId: gateway.id
		}).dependsOn(vpc, gateway)

		const route = new Route('', {
			gatewayId: gateway.id,
			routeTableId: publicRouteTable.id,
			destination: Peer.anyIpv4(),
		}).dependsOn(gateway, publicRouteTable)

		bootstrap.export(`vpc-id`, vpc.id)
		bootstrap.add(
			vpc,
			privateRouteTable,
			publicRouteTable,
			gateway,
			attachment,
			route
		)

		const zones = [ 'a', 'b' ]
		const tables = [ privateRouteTable, publicRouteTable ]
		let block = 0

		for(const table of tables) {
			for(const i in zones) {
				const id = `${table.name}-${i}`
				const subnet = new Subnet(id, {
					vpcId: vpc.id,
					cidrBlock: Peer.ipv4(`10.0.${block++}.0/24`),
					availabilityZone: config.region + zones[i],
				}).dependsOn(vpc)

				const association = new SubnetRouteTableAssociation(id, {
					routeTableId: table.id,
					subnetId: subnet.id,
				}).dependsOn(subnet, table)

				bootstrap.export(`${table.name}-subnet-${ Number(i) + 1 }`, subnet.id)
				bootstrap.add(
					subnet,
					association,
				)
			}
		}
	},
})
