import { aws, Node, WorkSpace, local } from '../../src'
import { minutes } from '@awsless/duration'
import { fromIni } from '@aws-sdk/credential-providers'

export const createWorkspace = (profile, region = 'eu-west-1', timeout = 15) => {
	const stateProvider = new local.StateProvider({
		dir: './examples/resources/state',
	})

	const credentials = fromIni({ profile })

	const cloudProviders = aws.createCloudProviders({
		region,
		credentials,
		timeout: minutes(timeout),
	})

	const workspace = new WorkSpace({ cloudProviders, stateProvider })

	workspace.on('stack', e =>
		console.log(
			//
			new Date(),
			'[Stack]'.padEnd(30),
			// e.stack.name,
			e.operation.toUpperCase(),
			e.status.toUpperCase()
		)
	)

	workspace.on('resource', e =>
		console.log(
			//
			new Date(),
			`[${e.type}]`.padEnd(30),
			e.operation.toUpperCase(),
			e.status.toUpperCase(),
			e.reason?.message ?? ''
		)
	)

	return workspace
}

export const createVPC = (stack: Node, region: string, ns = 'main') => {
	const group = new Node('vpc', ns)
	stack.add(group)

	const vpc = new aws.ec2.Vpc('vpc', {
		name: `vpc-${ns}`,
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

	group.add(vpc, privateRouteTable, publicRouteTable, gateway, attachment, route)

	const zones = ['a', 'b']
	const tables = [privateRouteTable, publicRouteTable]
	let block = 0

	const subnets = {
		private: [],
		public: [],
	} as Record<'private' | 'public', aws.ec2.Subnet[]>

	for (const table of tables) {
		for (const i in zones) {
			const index = Number(i) + 1
			const id = `${table.identifier}-${index}`
			const subnet = new aws.ec2.Subnet(id, {
				vpcId: vpc.id,
				cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
				availabilityZone: region + zones[i],
			})

			const association = new aws.ec2.SubnetRouteTableAssociation(id, {
				routeTableId: table.id,
				subnetId: subnet.id,
			})

			group.add(subnet, association)
			subnets[table.identifier].push(subnet)
		}
	}

	return {
		vpc,
		subnets,
	}
}
