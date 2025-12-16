# VPC Feature

The VPC (Virtual Private Cloud) feature in Awsless provides a streamlined way to define, configure, and use AWS VPC resources. It handles the complex aspects of VPC setup including subnets, route tables, internet gateways, and security groups.

## Overview

Amazon VPC lets you provision a logically isolated section of the AWS Cloud where you can launch AWS resources in a virtual network that you define. The VPC feature in Awsless makes it easy to:

- Create a secure VPC for your application resources
- Configure public and private subnets across multiple availability zones
- Set up proper routing with internet gateways
- Configure security groups for network access control
- Integrate VPC with other Awsless features like Lambda functions

## How VPC Works

When you deploy an Awsless application, a VPC is automatically created with the following configuration:

1. A VPC with CIDR block 10.0.0.0/16
2. Public and private subnets across two availability zones
3. An internet gateway for public internet access
4. Route tables for both public and private subnets
5. Security groups for controlling network access

The VPC is created at the application level and is available to all stacks in your application.

## VPC Architecture

The VPC is configured with the following architecture:

- **VPC**: A single VPC with CIDR block 10.0.0.0/16
- **Subnets**:
  - Public Subnet 1: 10.0.2.0/24 in region-a
  - Public Subnet 2: 10.0.3.0/24 in region-b
  - Private Subnet 1: 10.0.0.0/24 in region-a
  - Private Subnet 2: 10.0.1.0/24 in region-b
- **Internet Gateway**: Attached to the VPC for public internet access
- **Route Tables**:
  - Public Route Table: Routes traffic to the internet gateway
  - Private Route Table: Routes traffic within the VPC only

## Using VPC with Lambda Functions

To place a Lambda function inside the VPC, you can use the `vpc` property in the function configuration:

```json
{
  "functions": {
    "database-access": {
      "code": {
        "file": "./src/database-access.ts"
      },
      "vpc": true
    }
  }
}
```

When a function is placed in the VPC:

1. The function is deployed in the private subnets
2. A security group is attached to the function
3. The function can access resources within the VPC
4. The function can access the internet through the NAT gateway (if configured)
5. The function is granted the necessary IAM permissions to create and manage network interfaces

## VPC Access Patterns

The VPC feature supports different access patterns:

### Public Access

Resources in public subnets can:
- Access the internet directly through the internet gateway
- Be accessed from the internet (if security groups allow)
- Access other resources within the VPC

### Private Access

Resources in private subnets can:
- Access other resources within the VPC
- Access the internet through a NAT gateway (if configured)
- Cannot be accessed directly from the internet

## Security Considerations

The VPC feature implements several security best practices:

1. **Subnet Isolation**: Public and private subnets are isolated from each other
2. **Security Groups**: Default security groups control inbound and outbound traffic
3. **Network ACLs**: Network ACLs provide an additional layer of security
4. **Private Resources**: Sensitive resources are placed in private subnets
5. **Least Privilege**: Resources are granted only the permissions they need

## Best Practices

When using the VPC feature, consider these best practices:

1. **Use VPC for Sensitive Resources**: Place resources that handle sensitive data in the VPC
2. **Minimize Public Exposure**: Only expose resources to the internet when necessary
3. **Use Security Groups Wisely**: Configure security groups to allow only required traffic
4. **Monitor VPC Flow Logs**: Enable and monitor VPC flow logs for security analysis
5. **Consider VPC Endpoints**: Use VPC endpoints for secure access to AWS services
6. **Plan for High Availability**: Distribute resources across multiple availability zones

## Integration with Other Features

The VPC feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can be placed in the VPC
- **RDS**: Database instances can be deployed in the VPC
- **ElastiCache**: Cache clusters can be deployed in the VPC
- **OpenSearch**: Search domains can be deployed in the VPC
- **Redis**: Redis clusters can be deployed in the VPC
