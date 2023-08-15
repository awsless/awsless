{
	"Resources": {

	 "VpcHttp6E9B1436": {
	  "Type": "AWS::EC2::VPC",
	  "Properties": {
	   "CidrBlock": "10.0.0.0/16",
	   "EnableDnsHostnames": true,
	   "EnableDnsSupport": true,
	   "InstanceTenancy": "default",
	   "Tags": [
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet1Subnet05D6FED4": {
	  "Type": "AWS::EC2::Subnet",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "AvailabilityZone": "eu-west-1a",
	   "CidrBlock": "10.0.0.0/24",
	   "MapPublicIpOnLaunch": true,
	   "Tags": [
		{
		 "Key": "aws-cdk:subnet-name",
		 "Value": "public"
		},
		{
		 "Key": "aws-cdk:subnet-type",
		 "Value": "Public"
		},
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp/publicSubnet1"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet1RouteTable8E8AF3EF": {
	  "Type": "AWS::EC2::RouteTable",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "Tags": [
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp/publicSubnet1"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet1RouteTableAssociation00CE5A5E": {
	  "Type": "AWS::EC2::SubnetRouteTableAssociation",
	  "Properties": {
	   "RouteTableId": {
		"Ref": "VpcHttppublicSubnet1RouteTable8E8AF3EF"
	   },
	   "SubnetId": {
		"Ref": "VpcHttppublicSubnet1Subnet05D6FED4"
	   }
	  }
	 },
	 "VpcHttppublicSubnet1DefaultRoute9E537E6F": {
	  "Type": "AWS::EC2::Route",
	  "Properties": {
	   "RouteTableId": {
		"Ref": "VpcHttppublicSubnet1RouteTable8E8AF3EF"
	   },
	   "DestinationCidrBlock": "0.0.0.0/0",
	   "GatewayId": {
		"Ref": "VpcHttpIGW095F649E"
	   }
	  },
	  "DependsOn": [
	   "VpcHttpVPCGW08FD6DFA"
	  ]
	 },
	 "VpcHttppublicSubnet2SubnetDF5C26F8": {
	  "Type": "AWS::EC2::Subnet",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "AvailabilityZone": "eu-west-1b",
	   "CidrBlock": "10.0.1.0/24",
	   "MapPublicIpOnLaunch": true,
	   "Tags": [
		{
		 "Key": "aws-cdk:subnet-name",
		 "Value": "public"
		},
		{
		 "Key": "aws-cdk:subnet-type",
		 "Value": "Public"
		},
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp/publicSubnet2"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet2RouteTableF0183722": {
	  "Type": "AWS::EC2::RouteTable",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "Tags": [
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp/publicSubnet2"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet2RouteTableAssociation08CBB15F": {
	  "Type": "AWS::EC2::SubnetRouteTableAssociation",
	  "Properties": {
	   "RouteTableId": {
		"Ref": "VpcHttppublicSubnet2RouteTableF0183722"
	   },
	   "SubnetId": {
		"Ref": "VpcHttppublicSubnet2SubnetDF5C26F8"
	   }
	  }
	 },
	 "VpcHttppublicSubnet2DefaultRoute583021B2": {
	  "Type": "AWS::EC2::Route",
	  "Properties": {
	   "RouteTableId": {
		"Ref": "VpcHttppublicSubnet2RouteTableF0183722"
	   },
	   "DestinationCidrBlock": "0.0.0.0/0",
	   "GatewayId": {
		"Ref": "VpcHttpIGW095F649E"
	   }
	  },
	  "DependsOn": [
	   "VpcHttpVPCGW08FD6DFA"
	  ]
	 },
	 "VpcHttppublicSubnet3Subnet27042FFA": {
	  "Type": "AWS::EC2::Subnet",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "AvailabilityZone": "eu-west-1c",
	   "CidrBlock": "10.0.2.0/24",
	   "MapPublicIpOnLaunch": true,
	   "Tags": [
		{
		 "Key": "aws-cdk:subnet-name",
		 "Value": "public"
		},
		{
		 "Key": "aws-cdk:subnet-type",
		 "Value": "Public"
		},
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp/publicSubnet3"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet3RouteTable3B5C9F58": {
	  "Type": "AWS::EC2::RouteTable",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "Tags": [
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp/publicSubnet3"
		}
	   ]
	  }
	 },
	 "VpcHttppublicSubnet3RouteTableAssociationFB72A7FB": {
	  "Type": "AWS::EC2::SubnetRouteTableAssociation",
	  "Properties": {
	   "RouteTableId": {
		"Ref": "VpcHttppublicSubnet3RouteTable3B5C9F58"
	   },
	   "SubnetId": {
		"Ref": "VpcHttppublicSubnet3Subnet27042FFA"
	   }
	  }
	 },
	 "VpcHttppublicSubnet3DefaultRouteFF42A6F3": {
	  "Type": "AWS::EC2::Route",
	  "Properties": {
	   "RouteTableId": {
		"Ref": "VpcHttppublicSubnet3RouteTable3B5C9F58"
	   },
	   "DestinationCidrBlock": "0.0.0.0/0",
	   "GatewayId": {
		"Ref": "VpcHttpIGW095F649E"
	   }
	  },
	  "DependsOn": [
	   "VpcHttpVPCGW08FD6DFA"
	  ]
	 },
	 "VpcHttpIGW095F649E": {
	  "Type": "AWS::EC2::InternetGateway",
	  "Properties": {
	   "Tags": [
		{
		 "Key": "Name",
		 "Value": "bootstrap/VpcHttp"
		}
	   ]
	  }
	 },
	 "VpcHttpVPCGW08FD6DFA": {
	  "Type": "AWS::EC2::VPCGatewayAttachment",
	  "Properties": {
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   },
	   "InternetGatewayId": {
		"Ref": "VpcHttpIGW095F649E"
	   }
	  }
	 },
	 "SecurityGroupHttpDF9938A5": {
	  "Type": "AWS::EC2::SecurityGroup",
	  "Properties": {
	   "GroupDescription": "bootstrap/SecurityGroupHttp",
	   "SecurityGroupEgress": [
		{
		 "CidrIp": "0.0.0.0/0",
		 "Description": "Allow all outbound traffic by default",
		 "IpProtocol": "-1"
		}
	   ],
	   "SecurityGroupIngress": [
		{
		 "CidrIp": "0.0.0.0/0",
		 "Description": "from 0.0.0.0/0:443",
		 "FromPort": 443,
		 "IpProtocol": "tcp",
		 "ToPort": 443
		},
		{
		 "CidrIpv6": "::/0",
		 "Description": "from ::/0:443",
		 "FromPort": 443,
		 "IpProtocol": "tcp",
		 "ToPort": 443
		}
	   ],
	   "VpcId": {
		"Ref": "VpcHttp6E9B1436"
	   }
	  }
	 },
	 "LoadBalancerApi0CEB7736": {
	  "Type": "AWS::ElasticLoadBalancingV2::LoadBalancer",
	  "Properties": {
	   "LoadBalancerAttributes": [
		{
		 "Key": "deletion_protection.enabled",
		 "Value": "false"
		}
	   ],
	   "Name": "app-bootstrap-api",
	   "Scheme": "internal",
	   "SecurityGroups": [
		{
		 "Fn::GetAtt": [
		  "SecurityGroupHttpDF9938A5",
		  "GroupId"
		 ]
		}
	   ],
	   "Subnets": [
		{
		 "Ref": "VpcHttppublicSubnet1Subnet05D6FED4"
		},
		{
		 "Ref": "VpcHttppublicSubnet2SubnetDF5C26F8"
		},
		{
		 "Ref": "VpcHttppublicSubnet3Subnet27042FFA"
		}
	   ],
	   "Type": "application"
	  }
	 },
	 "LoadBalancerApiListenerApiB036B7F3": {
	  "Type": "AWS::ElasticLoadBalancingV2::Listener",
	  "Properties": {
	   "DefaultActions": [
		{
		 "FixedResponseConfig": {
		  "ContentType": "application/json",
		  "MessageBody": "{\"message\":\"Route not found\"}",
		  "StatusCode": "404"
		 },
		 "Type": "fixed-response"
		}
	   ],
	   "LoadBalancerArn": {
		"Ref": "LoadBalancerApi0CEB7736"
	   },
	   "Certificates": [
		{
		 "CertificateArn": {
		  "Ref": "CertificateGetblockalertCom"
		 }
		}
	   ],
	   "Port": 443,
	   "Protocol": "HTTPS"
	  }
	 },
	 "RecordSetApiC24DFE73": {
	  "Type": "AWS::Route53::RecordSet",
	  "Properties": {
	   "Name": "http.getblockalert.com.",
	   "Type": "A",
	   "AliasTarget": {
		"DNSName": {
		 "Fn::Join": [
		  "",
		  [
		   "dualstack.",
		   {
			"Fn::GetAtt": [
			 "LoadBalancerApi0CEB7736",
			 "DNSName"
			]
		   }
		  ]
		 ]
		},
		"HostedZoneId": {
		 "Fn::GetAtt": [
		  "LoadBalancerApi0CEB7736",
		  "CanonicalHostedZoneID"
		 ]
		}
	   },
	   "HostedZoneId": {
		"Ref": "HostedZoneGetblockalertCom"
	   }
	  }
	 },
	 "FunctionGlobalExportsServiceRole85649BE8": {
	  "Type": "AWS::IAM::Role",
	  "Properties": {
	   "AssumeRolePolicyDocument": {
		"Statement": [
		 {
		  "Action": "sts:AssumeRole",
		  "Effect": "Allow",
		  "Principal": {
		   "Service": "lambda.amazonaws.com"
		  }
		 }
		],
		"Version": "2012-10-17"
	   },
	   "ManagedPolicyArns": [
		{
		 "Fn::Join": [
		  "",
		  [
		   "arn:",
		   {
			"Ref": "AWS::Partition"
		   },
		   ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
		  ]
		 ]
		}
	   ]
	  }
	 },
	 "FunctionGlobalExportsServiceRoleDefaultPolicyB4709417": {
	  "Type": "AWS::IAM::Policy",
	  "Properties": {
	   "PolicyDocument": {
		"Statement": [
		 {
		  "Action": "cloudformation:ListExports",
		  "Effect": "Allow",
		  "Resource": "*"
		 }
		],
		"Version": "2012-10-17"
	   },
	   "PolicyName": "FunctionGlobalExportsServiceRoleDefaultPolicyB4709417",
	   "Roles": [
		{
		 "Ref": "FunctionGlobalExportsServiceRole85649BE8"
		}
	   ]
	  }
	 },
	 "FunctionGlobalExports": {
	  "Type": "AWS::Lambda::Function",
	  "Properties": {
	   "Code": {
		"ZipFile": "\nconst { CloudFormationClient, ListExportsCommand } = require('@aws-sdk/client-cloudformation')\n\nexports.handler = async (event) => {\n\tconst region = event.ResourceProperties.region\n\n\ttry {\n\t\tconst data = await listExports(region)\n\n\t\tawait send(event, region, 'SUCCESS', data)\n\t} catch(error) {\n\t\tif (error instanceof Error) {\n\t\t\tawait send(event, region, 'FAILED', {}, error.message)\n\t\t} else {\n\t\t\tawait send(event, region, 'FAILED', {}, 'Unknown error')\n\t\t}\n\t}\n}\n\nconst send = async (event, id, status, data, reason = '') => {\n\tconst body = JSON.stringify({\n\t\tStatus: status,\n\t\tReason: reason,\n\t\tPhysicalResourceId: id,\n\t\tStackId: event.StackId,\n\t\tRequestId: event.RequestId,\n\t\tLogicalResourceId: event.LogicalResourceId,\n\t\tNoEcho: false,\n\t\tData: data\n\t})\n\n\tawait fetch(event.ResponseURL, {\n\t\tmethod: 'PUT',\n\t\tport: 443,\n\t\tbody,\n\t\theaders: {\n\t\t\t'content-type': '',\n            'content-length': Buffer.from(body).byteLength,\n\t\t},\n\t})\n}\n\nconst listExports = async (region) => {\n\tconst client = new CloudFormationClient({ region })\n\tconst data = {}\n\n\tlet token\n\n\twhile(true) {\n\t\tconst result = await client.send(new ListExportsCommand({\n\t\t\tNextToken: token\n\t\t}))\n\n\t\tresult.Exports?.forEach(item => {\n\t\t\tdata[item.Name] = item.Value\n\t\t})\n\n\t\tif(result.NextToken) {\n\t\t\ttoken = result.NextToken\n\t\t} else {\n\t\t\treturn data\n\t\t}\n\t}\n}\n"
	   },
	   "Role": {
		"Fn::GetAtt": [
		 "FunctionGlobalExportsServiceRole85649BE8",
		 "Arn"
		]
	   },
	   "FunctionName": "custom-resource-global-exports",
	   "Handler": "index.handler",
	   "Runtime": "nodejs18.x"
	  },
	  "DependsOn": [
	   "FunctionGlobalExportsServiceRoleDefaultPolicyB4709417",
	   "FunctionGlobalExportsServiceRole85649BE8"
	  ]
	 },
	 "SchemaApi": {
	  "Type": "AWS::AppSync::GraphQLSchema",
	  "Properties": {
	   "ApiId": {
		"Fn::GetAtt": [
		 "GraphqlApi",
		 "ApiId"
		]
	   },
	   "Definition": "type Query {\n  get: String\n  list: [String]!\n}\n\nschema {\n  query: Query\n}"
	  }
	 }
	},
	"Outputs": {
	 "OutputApi": {
	  "Value": {
	   "Fn::GetAtt": [
		"GraphqlApi",
		"ApiId"
	   ]
	  },
	  "Export": {
	   "Name": "GraphqlApi"
	  }
	 },
	 "OutputHostedZoneGetblockalertCom": {
	  "Value": {
	   "Ref": "HostedZoneGetblockalertCom"
	  },
	  "Export": {
	   "Name": "hosted-zone-getblockalert-com-id"
	  }
	 },
	 "OutputCertificateGetblockalertCom": {
	  "Value": {
	   "Ref": "CertificateGetblockalertCom"
	  },
	  "Export": {
	   "Name": "certificate-getblockalert-com-arn"
	  }
	 },
	 "OutputHttpVpc": {
	  "Value": {
	   "Ref": "VpcHttp6E9B1436"
	  },
	  "Export": {
	   "Name": "http-vpc-id"
	  }
	 },
	 "OutputHttpSecurityGroup": {
	  "Value": {
	   "Fn::GetAtt": [
		"SecurityGroupHttpDF9938A5",
		"GroupId"
	   ]
	  },
	  "Export": {
	   "Name": "http-security-group-id"
	  }
	 },
	 "OutputHttpApiListener": {
	  "Value": {
	   "Ref": "LoadBalancerApiListenerApiB036B7F3"
	  },
	  "Export": {
	   "Name": "http-api-listener-arn"
	  }
	 }
	},
	"Mappings": {
	 "AWSCloudFrontPartitionHostedZoneIdMap": {
	  "aws": {
	   "zoneId": "Z2FDTNDATAQYW2"
	  },
	  "aws-cn": {
	   "zoneId": "Z3RFFRIM2A3IF5"
	  }
	 }
	}
   }
