# Instance Feature

The Instance feature in Awsless provides a streamlined way to define, configure, and deploy Amazon EC2 instances. It handles the complex aspects of instance setup including launch templates, IAM roles, security groups, user data scripts, and code deployment.

## Overview

EC2 instances are essential for workloads that require full control over the computing environment. The Instance feature in Awsless makes it easy to:

- Define EC2 instances with optimal configurations
- Deploy code to instances automatically
- Configure startup commands and environment variables
- Set up IAM permissions for instances
- Connect to instances securely
- Monitor instance logs with CloudWatch

## Schema

The Instance feature uses a two-part schema to define instances:

1. **Global instance settings** in `app.json`
2. **Stack-specific instance definitions** in stack files

### Global Instance Settings

In your `app.json` file, you can define global settings for all instances:

```json
{
  "defaults": {
    "instance": {
      "connect": true
    }
  }
}
```

### Stack-Specific Instance Definitions

In your stack files, you define the instances:

```json
{
  "instances": {
    "worker": {
      "image": "ami-0c55b159cbfafe1f0",
      "type": "t3.medium",
      "code": "./src/worker",
      "user": "ec2-user",
      "command": "npm install && npm start",
      "environment": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      },
      "permissions": [
        {
          "actions": ["s3:GetObject", "s3:PutObject"],
          "resources": ["arn:aws:s3:::my-bucket/*"]
        }
      ]
    }
  }
}
```

### Schema Properties

#### Global Instance Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `connect` | Boolean | Enable Instance Connect Endpoint for secure SSH access | `false` |

#### Stack-Specific Instance Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `image` | String | AMI ID for the instance | Required |
| `type` | String | EC2 instance type | Required |
| `code` | String | Local directory containing code to deploy | Required |
| `user` | String | OS user for running commands | `ec2-user` |
| `command` | String | Command to run after instance startup | - |
| `environment` | Object | Environment variables for the instance | - |
| `permissions` | Array | IAM permissions for the instance | - |
| `waitForTermination` | Boolean | Wait for instance termination during stack deletion | `true` |

#### Available Instance Types

The `type` property can be one of many values, including:

**General Purpose**
- `t3.nano`, `t3.micro`, `t3.small`, `t3.medium`, `t3.large`, `t3.xlarge`, `t3.2xlarge`
- `t4g.nano`, `t4g.micro`, `t4g.small`, `t4g.medium`, `t4g.large`, `t4g.xlarge`, `t4g.2xlarge`

**GPU Instances**
- `g4ad.xlarge`
- `g4dn.xlarge`

## How Instances Work

When you define an instance in Awsless:

1. Your code directory is zipped and uploaded to an S3 bucket
2. A launch template is created with your instance configuration
3. An IAM role and instance profile are created with your permissions
4. A user data script is generated to download and run your code
5. An EC2 instance is launched with your configuration
6. A CloudWatch log group is created for instance logs

## Code Deployment

The code deployment process works as follows:

1. Your local code directory is zipped during the build process
2. The zip file is uploaded to an S3 bucket
3. When the instance starts, it downloads the zip file
4. The code is extracted to the user's home directory
5. The specified command is executed in the code directory

## Environment Variables

Environment variables are set in two ways:

1. **System Environment Variables**: Set by Awsless, including:
   - `APP`: Application name
   - `APP_ID`: Application ID
   - `STACK`: Stack name
   - `CLOUDWATCH_LOG_GROUP_NAME`: CloudWatch log group name
   - Other environment variables from your stack

2. **User Environment Variables**: Set in your instance configuration:
   ```json
   "environment": {
     "NODE_ENV": "production",
     "LOG_LEVEL": "info"
   }
   ```

## IAM Permissions

You can define IAM permissions for your instances using the `permissions` property:

```json
"permissions": [
  {
    "effect": "allow",
    "actions": ["s3:GetObject", "s3:PutObject"],
    "resources": ["arn:aws:s3:::my-bucket/*"]
  },
  {
    "effect": "deny",
    "actions": ["s3:DeleteObject"],
    "resources": ["arn:aws:s3:::my-bucket/important/*"]
  }
]
```

Each permission object has the following properties:

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `effect` | String | `allow` or `deny` | `allow` |
| `actions` | Array | AWS IAM actions | Required |
| `resources` | Array | AWS resource ARNs or `*` | Required |

## Instance Connect

You can enable Instance Connect Endpoint for secure SSH access to your instances:

```json
{
  "defaults": {
    "instance": {
      "connect": true
    }
  }
}
```

With Instance Connect enabled, you can connect to your instances using the AWS CLI or AWS Console without exposing SSH ports to the internet.

## Logging

Each instance automatically sends logs to CloudWatch Logs. The log group name is:

```
/awsless/instance/{app-name}--{stack-name}--instance--{instance-name}
```

You can view these logs in the AWS Console or using the AWS CLI:

```bash
aws logs get-log-events --log-group-name /awsless/instance/my-app--my-stack--instance--worker
```

## Best Practices

When using the Instance feature, consider these best practices:

1. **Use the Right Instance Type**: Choose an instance type based on your workload requirements
2. **Minimize Instance Count**: Use instances only for workloads that can't run on serverless
3. **Implement Proper Logging**: Use structured logging to make logs more searchable
4. **Follow Least Privilege**: Grant only the permissions your instance needs
5. **Use Environment Variables**: Store configuration in environment variables
6. **Implement Health Checks**: Add health checks to your application
7. **Consider Auto Scaling**: For production workloads, consider using multiple instances with auto scaling

## Integration with Other Features

The Instance feature integrates seamlessly with other Awsless features:

- **VPC**: Instances are deployed in your VPC's public subnet
- **Store**: Instances can access S3 buckets with proper permissions
- **Config**: Instances can use configuration values
- **Alert**: Instances can send alerts for critical events
