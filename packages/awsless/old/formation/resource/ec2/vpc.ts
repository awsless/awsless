
import { Resource } from "../../resource";
import { ref } from "../../util";

export type VpcProps = {
	// ??? wat is een VPC en hoe de fuck werkt het.
	availabilityZones: string[]
}

export class Vpc extends Resource {

	constructor(readonly logicalId: string, private props: VpcProps) {
		super('ec2', 'vpc', logicalId)
	}

	get id() {
		return ref(`${ this.logicalId }Vpc`)
	}

	template() {
		return {
			[ `${ this.logicalId }Vpc` ]: {
				Type: 'AWS::EC2::VPC',
				Properties: {
					CidrBlock: '10.0.0.0/16',
				}
			},
			[ `${ this.logicalId }InternetGateway` ]: {
				Type: 'AWS::EC2::InternetGateway',
			},
			[ `${ this.logicalId }VPCGatewayAttachment` ]: {
				Type: 'AWS::EC2::VPCGatewayAttachment',
				Properties: {
					VpcId: this.id,
					InternetGatewayId: ref(`${this.logicalId}InternetGateway`)
				}
			},
			[ `${ this.logicalId }RouteTable` ]: {
				Type: 'AWS::EC2::RouteTable',
				Properties: {
					VpcId: this.id,
				}
			},
			[ `${ this.logicalId }Route` ]: {
				Type: 'AWS::EC2::Route',
				Properties: {
					GatewayId: ref(`${this.logicalId}InternetGateway`),
					RouteTableId: ref(`${this.logicalId}RouteTable`),
					DestinationCidrBlock: '0.0.0.0/0',
				}
			},

			...(this.props.availabilityZones.map(availabilityZone => ({
				[ `${ this.logicalId }Subnet` ]: {
					Type: 'AWS::EC2::Subnet',
					Properties: {
						CidrBlock: '10.0.0.0/16',
						VpcId: this.id,
						AvailabilityZone: availabilityZone,
					}
				},
				[ `${ this.logicalId }SubnetRouteTableAssociation` ]: {
					Type: 'AWS::EC2::SubnetRouteTableAssociation',
					Properties: {
						SubnetId: ref(`${ this.logicalId }Subnet`),
						RouteTableId: ref(`${ this.logicalId }RouteTable`),
					}
				}
			})))
		}
	}
}

// const vpc = new Vpc(stack, toId('vpc', 'http'), {
// 	subnetConfiguration: [{
// 		name: 'public',
// 		subnetType: SubnetType.PUBLIC,
// 		cidrMask: 24,
// 	}],
// 	availabilityZones: [
// 		config.region + 'a',
// 		config.region + 'b',
// 		config.region + 'c',
// 	],
// })

// const securityGroup = new SecurityGroup(stack, toId('security-group', 'http'), {
// 	vpc,
// })

// securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443))
// securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443))

// "VpcHttp6E9B1436": {
// 	"Type": "AWS::EC2::VPC",
// 	"Properties": {
// 	 "CidrBlock": "10.0.0.0/16",
// 	 "EnableDnsHostnames": true,
// 	 "EnableDnsSupport": true,
// 	 "InstanceTenancy": "default",
// 	 "Tags": [
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet1Subnet05D6FED4": {
// 	"Type": "AWS::EC2::Subnet",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "AvailabilityZone": "eu-west-1a",
// 	 "CidrBlock": "10.0.0.0/24",
// 	 "MapPublicIpOnLaunch": true,
// 	 "Tags": [
// 	  {
// 	   "Key": "aws-cdk:subnet-name",
// 	   "Value": "public"
// 	  },
// 	  {
// 	   "Key": "aws-cdk:subnet-type",
// 	   "Value": "Public"
// 	  },
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp/publicSubnet1"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet1RouteTable8E8AF3EF": {
// 	"Type": "AWS::EC2::RouteTable",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "Tags": [
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp/publicSubnet1"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet1RouteTableAssociation00CE5A5E": {
// 	"Type": "AWS::EC2::SubnetRouteTableAssociation",
// 	"Properties": {
// 	 "RouteTableId": {
// 	  "Ref": "VpcHttppublicSubnet1RouteTable8E8AF3EF"
// 	 },
// 	 "SubnetId": {
// 	  "Ref": "VpcHttppublicSubnet1Subnet05D6FED4"
// 	 }
// 	}
//    },
//    "VpcHttppublicSubnet1DefaultRoute9E537E6F": {
// 	"Type": "AWS::EC2::Route",
// 	"Properties": {
// 	 "RouteTableId": {
// 	  "Ref": "VpcHttppublicSubnet1RouteTable8E8AF3EF"
// 	 },
// 	 "DestinationCidrBlock": "0.0.0.0/0",
// 	 "GatewayId": {
// 	  "Ref": "VpcHttpIGW095F649E"
// 	 }
// 	},
// 	"DependsOn": [
// 	 "VpcHttpVPCGW08FD6DFA"
// 	]
//    },
//    "VpcHttppublicSubnet2SubnetDF5C26F8": {
// 	"Type": "AWS::EC2::Subnet",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "AvailabilityZone": "eu-west-1b",
// 	 "CidrBlock": "10.0.1.0/24",
// 	 "MapPublicIpOnLaunch": true,
// 	 "Tags": [
// 	  {
// 	   "Key": "aws-cdk:subnet-name",
// 	   "Value": "public"
// 	  },
// 	  {
// 	   "Key": "aws-cdk:subnet-type",
// 	   "Value": "Public"
// 	  },
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp/publicSubnet2"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet2RouteTableF0183722": {
// 	"Type": "AWS::EC2::RouteTable",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "Tags": [
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp/publicSubnet2"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet2RouteTableAssociation08CBB15F": {
// 	"Type": "AWS::EC2::SubnetRouteTableAssociation",
// 	"Properties": {
// 	 "RouteTableId": {
// 	  "Ref": "VpcHttppublicSubnet2RouteTableF0183722"
// 	 },
// 	 "SubnetId": {
// 	  "Ref": "VpcHttppublicSubnet2SubnetDF5C26F8"
// 	 }
// 	}
//    },
//    "VpcHttppublicSubnet2DefaultRoute583021B2": {
// 	"Type": "AWS::EC2::Route",
// 	"Properties": {
// 	 "RouteTableId": {
// 	  "Ref": "VpcHttppublicSubnet2RouteTableF0183722"
// 	 },
// 	 "DestinationCidrBlock": "0.0.0.0/0",
// 	 "GatewayId": {
// 	  "Ref": "VpcHttpIGW095F649E"
// 	 }
// 	},
// 	"DependsOn": [
// 	 "VpcHttpVPCGW08FD6DFA"
// 	]
//    },
//    "VpcHttppublicSubnet3Subnet27042FFA": {
// 	"Type": "AWS::EC2::Subnet",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "AvailabilityZone": "eu-west-1c",
// 	 "CidrBlock": "10.0.2.0/24",
// 	 "MapPublicIpOnLaunch": true,
// 	 "Tags": [
// 	  {
// 	   "Key": "aws-cdk:subnet-name",
// 	   "Value": "public"
// 	  },
// 	  {
// 	   "Key": "aws-cdk:subnet-type",
// 	   "Value": "Public"
// 	  },
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp/publicSubnet3"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet3RouteTable3B5C9F58": {
// 	"Type": "AWS::EC2::RouteTable",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "Tags": [
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp/publicSubnet3"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttppublicSubnet3RouteTableAssociationFB72A7FB": {
// 	"Type": "AWS::EC2::SubnetRouteTableAssociation",
// 	"Properties": {
// 	 "RouteTableId": {
// 	  "Ref": "VpcHttppublicSubnet3RouteTable3B5C9F58"
// 	 },
// 	 "SubnetId": {
// 	  "Ref": "VpcHttppublicSubnet3Subnet27042FFA"
// 	 }
// 	}
//    },
//    "VpcHttppublicSubnet3DefaultRouteFF42A6F3": {
// 	"Type": "AWS::EC2::Route",
// 	"Properties": {
// 	 "RouteTableId": {
// 	  "Ref": "VpcHttppublicSubnet3RouteTable3B5C9F58"
// 	 },
// 	 "DestinationCidrBlock": "0.0.0.0/0",
// 	 "GatewayId": {
// 	  "Ref": "VpcHttpIGW095F649E"
// 	 }
// 	},
// 	"DependsOn": [
// 	 "VpcHttpVPCGW08FD6DFA"
// 	]
//    },
//    "VpcHttpIGW095F649E": {
// 	"Type": "AWS::EC2::InternetGateway",
// 	"Properties": {
// 	 "Tags": [
// 	  {
// 	   "Key": "Name",
// 	   "Value": "bootstrap/VpcHttp"
// 	  }
// 	 ]
// 	}
//    },
//    "VpcHttpVPCGW08FD6DFA": {
// 	"Type": "AWS::EC2::VPCGatewayAttachment",
// 	"Properties": {
// 	 "VpcId": {
// 	  "Ref": "VpcHttp6E9B1436"
// 	 },
// 	 "InternetGatewayId": {
// 	  "Ref": "VpcHttpIGW095F649E"
// 	 }
// 	}
//    },