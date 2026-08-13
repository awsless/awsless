import { fromIni } from '@aws-sdk/credential-providers'
import { minutes } from '@awsless/duration'
import { aws, local, Node, WorkSpace } from '../../src'

export const createWorkspace = (profile: string, region = 'eu-west-1', timeout = 15) => {
	const credentials = fromIni({ profile })

	const workspace = new WorkSpace({
		cloudProviders: aws.createCloudProviders({
			region,
			credentials,
			timeout: minutes(timeout),
			accountId: '468004125411',
		}),
		stateProvider: new local.file.StateProvider({
			dir: './examples/resources/state',
		}),
		lockProvider: new local.file.LockProvider({
			dir: './examples/resources/state',
		}),
		// lockProvider: new aws.dynamodb.LockProvider({
		// 	region,
		// 	credentials,
		// 	tableName: 'awsless-lock',
		// }),
		// stateProvider: new aws.s3.StateProvider({
		// 	region,
		// 	credentials,
		// 	bucket: 'awsless-state',
		// }),
	})

	// workspace.on('stack', e =>
	// 	console.log(
	// 		//
	// 		new Date(),
	// 		'[Stack]'.padEnd(30),
	// 		// e.stack.name,
	// 		e.operation.toUpperCase(),
	// 		e.status.toUpperCase()
	// 	)
	// )

	// workspace.on('resource', e =>
	// 	console.log(
	// 		//
	// 		new Date(),
	// 		`[${e.type}]`.padEnd(30),
	// 		e.operation.toUpperCase(),
	// 		e.status.toUpperCase(),
	// 		e.reason?.message ?? ''
	// 	)
	// )

	return workspace
}

export const createVPC = (stack: Node, region: string, ns = 'formation') => {
	const group = new Node(stack, 'vpc', ns)

	const vpc = new aws.ec2.Vpc(group, 'vpc', {
		name: `vpc-${ns}`,
		cidrBlock: aws.ec2.Peer.ipv4('10.0.0.0/16'),
	})

	// const cidrBlock = new aws.ec2.VPCCidrBlock(group, 'vpc', {
	// 	vpcId: vpc.id,
	// 	amazonProvidedIpv6CidrBlock: true,
	// })

	const privateRouteTable = new aws.ec2.RouteTable(group, 'private', {
		vpcId: vpc.id,
		name: 'private',
	})

	const publicRouteTable = new aws.ec2.RouteTable(group, 'public', {
		vpcId: vpc.id,
		name: 'public',
	})

	const gateway = new aws.ec2.InternetGateway(group, 'gateway')

	new aws.ec2.VPCGatewayAttachment(group, 'attachment', {
		vpcId: vpc.id,
		internetGatewayId: gateway.id,
	})

	new aws.ec2.Route(group, 'route', {
		gatewayId: gateway.id,
		routeTableId: publicRouteTable.id,
		destination: aws.ec2.Peer.anyIpv4(),
	})

	const zones = ['a', 'b']
	const tables = [privateRouteTable, publicRouteTable]
	let block = 0

	const subnets = {
		private: [],
		public: [],
	} as Record<'private' | 'public', aws.ec2.Subnet[]>

	for (const table of tables) {
		for (const i in zones) {
			block = block + 1
			const index = Number(i) + 1
			const id = `${table.identifier}-${index}`
			const subnet = new aws.ec2.Subnet(group, id, {
				name: `subnet-${table.identifier}-${index}`,
				vpcId: vpc.id,
				cidrBlock: aws.ec2.Peer.ipv4(`10.0.${block++}.0/24`),
				availabilityZone: region + zones[i],
			})

			new aws.ec2.SubnetRouteTableAssociation(group, id, {
				routeTableId: table.id,
				subnetId: subnet.id,
			})

			if (table.identifier === 'private' || table.identifier === 'public') {
				subnets[table.identifier].push(subnet)
			}
		}
	}

	return {
		vpc,
		subnets,
	}
}
