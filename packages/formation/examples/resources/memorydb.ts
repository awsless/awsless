import { App, AppError, aws, Stack } from '../../src'
import { createVPC, createWorkspace } from './_util'

const region = 'eu-west-1'
const workspace = createWorkspace('jacksclub', region, 60)
const app = new App('memorydb')
const stack = new Stack(app, 'memorydb')

const { vpc, subnets } = createVPC(stack, region)

const securityGroup = new aws.ec2.SecurityGroup(stack, 'memorydb-security-group', {
	name: 'memorydb-security-group',
	vpcId: vpc.id,
	description: 'memorydb-security-group',
})

const port = aws.ec2.Port.tcp(6379)

securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv4() })
securityGroup.addIngressRule({ port, peer: aws.ec2.Peer.anyIpv6() })

const subnetGroup = new aws.memorydb.SubnetGroup(stack, 'memorydb-subnet2', {
	name: 'memorydb-formation-test',
	subnetIds: subnets.private.map(s => s.id),
})

new aws.memorydb.Cluster(stack, 'memorydb', {
	name: 'memorydb-formation-test',
	aclName: 'open-access',
	securityGroupIds: [securityGroup.id],
	subnetGroupName: subnetGroup.name,
	type: 't4g.small',
})

console.log('START')

try {
	await workspace.deployApp(app)
	// await workspace.deleteApp(app)
} catch (error) {
	if (error instanceof AppError) {
		for (const issue of error.issues) {
			console.error(issue)
		}
	}

	throw error
}

console.log('END')
