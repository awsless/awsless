import { aws, App, Stack } from '../../src'
import { createVPC, createWorkspace } from './_util'

const region = 'eu-west-1'
const app = new App('memorydb')
const stack = new Stack('memorydb')
app.add(stack)

// const { vpc, subnets } = createVPC(stack, region)

// const securityGroup = new aws.ec2.SecurityGroup('memorydb-security-group', {
// 	name: 'memorydb-security-group',
// 	vpcId: vpc.id,
// 	description: 'memorydb-security-group',
// })

// const port = aws.ec2.Port.tcp(6379)

// securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv4() })
// securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv6() })

// const subnetGroup = new aws.memorydb.SubnetGroup('memorydb-subnet2', {
// 	name: 'memorydb-formation-test',
// 	subnetIds: subnets.private.map(s => s.id),
// })

// const cluster = new aws.memorydb.Cluster('memorydb', {
// 	name: 'memorydb-formation-test',
// 	aclName: 'open-access',
// 	securityGroupIds: [securityGroup.id],
// 	subnetGroupName: subnetGroup.name,
// 	type: 't4g.small',
// })

// stack.add(subnetGroup, securityGroup, cluster)

const main = async () => {
	const workspace = createWorkspace('jacksclub', region, 60)
	await workspace.deployStack(stack)
}

main()
