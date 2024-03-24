import { Peer } from './peer'

export const createVpcNetwork = (
	id: string,
	props: {
		name: string
		cidrBlock: Peer
		subnets: {}[]
	}
) => {
	console.log(props)
}

// const vpc = new aws.ec2.Vpc('test', {
// 	name: 'test',
// 	cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
// })

// // vpc.addRouteTable('private')

// stack.add(vpc)

// const privateRouteTable = new aws.ec2.RouteTable('private', {
// 	vpcId: vpc.id,
// 	name: 'private',
// })

// vpc.add(privateRouteTable)

// const publicRouteTable = new aws.ec2.RouteTable('public', {
// 	vpcId: vpc.id,
// 	name: 'public',
// })

// vpc.add(publicRouteTable)

// const gateway = new aws.ec2.InternetGateway('test', {
// 	name: 'test',
// })

// vpc.add(gateway)

// const attachment = new aws.ec2.VPCGatewayAttachment('test', {
// 	vpcId: vpc.id,
// 	internetGatewayId: gateway.id,
// })

// vpc.add(attachment)

// const route = new aws.ec2.Route('test', {
// 	gatewayId: gateway.id,
// 	routeTableId: publicRouteTable.id,
// 	destination: aws.ec2.Peer.anyIpv4(),
// })

// vpc.add(route)

// const zones = ['a', 'b']
// const tables = [privateRouteTable, publicRouteTable]
// const subnetIds: Input<string>[] = []

// let block = 0

// for (const table of tables) {
// 	for (const i in zones) {
// 		const id = `${table.identifier}-${i}`
// 		const subnet = new aws.ec2.Subnet(id, {
// 			vpcId: vpc.id,
// 			cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
// 			availabilityZone: region + zones[i],
// 		})

// 		subnet.associateRouteTable(table.id)

// 		vpc.add(subnet)

// 		subnetIds.push(subnet.id)
// 	}
// }
