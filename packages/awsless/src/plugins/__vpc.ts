
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
// import { toId, toName } from '../util/resource.js';
// import { CfnCluster, CfnACL, CfnUser, CfnSubnetGroup } from 'aws-cdk-lib/aws-memorydb';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

export const vpcPlugin = definePlugin({
	name: 'vpc',
	schema: z.object({
		defaults: z.object({
			vpc: z.boolean().default(false),
		}).default({}),
	}),
	onBootstrap({ config, stack }) {
		const vpc = new Vpc(stack, 'VPC', {
			subnetConfiguration: [{
				name: 'private',
				subnetType: SubnetType.PRIVATE_ISOLATED,
				cidrMask: 24,
			}],
			availabilityZones: [
				config.region + 'a',
				config.region + 'b',
				config.region + 'c',
			]
		})

		// vpc.addGatewayEndpoint('', {
		// 	''
		// })
	},
})



// VPC:
//   Type: AWS::EC2::VPC
//   Properties:
//     CidrBlock: 172.31.0.0/16

// SubnetA:
//   Type: AWS::EC2::Subnet
//   Properties:
//     VpcId: !Ref VPC
//     AvailabilityZone: ${var:Config.Region}a
//     CidrBlock: 172.31.1.0/24

// SubnetB:
//   Type: AWS::EC2::Subnet
//   Properties:
//     VpcId: !Ref VPC
//     AvailabilityZone: ${var:Config.Region}b
//     CidrBlock: 172.31.2.0/24

// SubnetC:
//   Type: AWS::EC2::Subnet
//   Properties:
//     VpcId: !Ref VPC
//     AvailabilityZone: ${var:Config.Region}c
//     CidrBlock: 172.31.3.0/24

// InternetGateway:
//   Type: AWS::EC2::InternetGateway

// GatewayToInternet:
//   Type: AWS::EC2::VPCGatewayAttachment
//   Properties:
//     VpcId: !Ref VPC
//     InternetGatewayId: !Ref InternetGateway


// RouteTable:
//   Type: AWS::EC2::RouteTable
//   Properties:
//     VpcId: !Ref VPC

// Route:
//   Type: AWS::EC2::Route
//   DependsOn: GatewayToInternet
//   Properties:
//     GatewayId: !Ref InternetGateway
//     RouteTableId: !Ref RouteTable
//     DestinationCidrBlock: 0.0.0.0/0

// Subnet1RouteTableAssociation:
//   Type: AWS::EC2::SubnetRouteTableAssociation
//   Properties:
//     SubnetId: !Ref SubnetA
//     RouteTableId: !Ref RouteTable

// Subnet2RouteTableAssociation:
//   Type: AWS::EC2::SubnetRouteTableAssociation
//   Properties:
//     SubnetId: !Ref SubnetB
//     RouteTableId: !Ref RouteTable

// Subnet3RouteTableAssociation:
//   Type: AWS::EC2::SubnetRouteTableAssociation
//   Properties:
//     SubnetId: !Ref SubnetC
//     RouteTableId: !Ref RouteTable


// SecurityGroup:
//   Type: AWS::EC2::SecurityGroup
//   Properties:
//     VpcId: !Ref VPC
//     GroupName: Security Group ${var:Config.Stack}
//     GroupDescription: Security Group ${var:Config.Stack}

//     SecurityGroupIngress:
//       - CidrIp: 0.0.0.0/0
//         FromPort: 19137
//         ToPort: 19137
//         IpProtocol: tcp
