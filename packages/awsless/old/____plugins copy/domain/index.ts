
import { z } from 'zod'
import { definePlugin } from '../../plugin.js';
import { toExportName, toId } from '../../util/resource.js';
import { HostedZone, CfnRecordSetGroup } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { DurationSchema } from '../../schema/duration.js';
import { RecordTypeSchema } from './schema/record-type.js';
import { DomainNameSchema } from './schema/domain-name.js';
import { CfnOutput, CfnResource } from 'aws-cdk-lib';

// DomainCertificateEUWest:
//   Type: AWS::CertificateManager::Certificate
//   Region: eu-west-1
//   Properties:
//     DomainName: !ssm domain
//     ValidationMethod: DNS
//     DomainValidationOptions:
//       - DomainName: !ssm domain
//         HostedZoneId: !cf [ us-east-1, MainHostedZoneId ]
//       - DomainName: !ssm mirror
//         HostedZoneId: !cf [ us-east-1, MirrorHostedZoneId ]
//     SubjectAlternativeNames:
//       - '*.${ssm:domain}'
//       - !ssm mirror
//       - '*.${ssm:mirror}'


// const lol = {
// 	domains: {
// 		'jacksclub.dev': [{
// 			subdomain: 'mail',
// 			type: 'MX',
// 			records: [ '10 feedback-smtp.eu-west-1.amazonses.com.' ],
// 		}]
// 	}
// }

export const domainPlugin = definePlugin({
	name: 'domain',
	schema: z.object({
		domains: z.record(DomainNameSchema, z.object({
			name: DomainNameSchema.optional(),
			type: RecordTypeSchema,
			ttl: DurationSchema,
			records: z.string().array(),
		}).array()).optional(),
	}),
	onBootstrap({ config, stack, usEastStack }) {

		Object.entries(config.domains || {}).forEach(([ domain, dnsRecords ]) => {
			const hostedZone = new HostedZone(stack, toId('hosted-zone', domain), {
				zoneName: domain,
				addTrailingDot: true,
			})

			;(hostedZone.node.defaultChild as CfnResource).overrideLogicalId(toId('hosted-zone', domain))

			const certificate = new Certificate(stack, toId('certificate', domain), {
				domainName: domain,
				validation: CertificateValidation.fromDns(hostedZone),
				subjectAlternativeNames: [ `*.${domain}` ]
			})

			;(certificate.node.defaultChild as CfnResource).overrideLogicalId(toId('certificate', domain))

			new CfnOutput(stack, toId('output-hosted-zone', domain), {
				exportName: toExportName(`hosted-zone-${domain}-id`),
				value: hostedZone.hostedZoneId,
			})

			new CfnOutput(stack, toId('output-certificate', domain), {
				exportName: toExportName(`certificate-${domain}-arn`),
				value: certificate.certificateArn,
			})

			const usEastHostedZone = new HostedZone(usEastStack, toId('hosted-zone', domain), {
				zoneName: domain,
				addTrailingDot: true,
			})

			const usEastCertificate = new Certificate(usEastStack, toId('certificate', domain), {
				domainName: domain,
				validation: CertificateValidation.fromDns(usEastHostedZone),
				subjectAlternativeNames: [ `*.${domain}` ]
			})

			new CfnOutput(usEastStack, toId('output-hosted-zone', domain), {
				exportName: toExportName(`hosted-zone-${domain}-id`),
				value: usEastHostedZone.hostedZoneId,
			})

			new CfnOutput(usEastStack, toId('output-certificate', domain), {
				exportName: toExportName(`certificate-${domain}-arn`),
				value: usEastCertificate.certificateArn,
			})

			if(dnsRecords.length > 0) {
				new CfnRecordSetGroup(stack, toId('record-set-group', domain), {
					hostedZoneId: hostedZone.hostedZoneId,
					recordSets: dnsRecords.map(props => ({
						name: props.name || '',
						type: props.type,
						ttl: props.ttl.toSeconds().toString(),
						resourceRecords: props.records,
					}))
				})
			}
		})
	},
})



// ctx.addResource "#{ ctx.name }ElbLambdaPermission#{ postfix }", {
// 	Type: 'AWS::Lambda::Permission'
// 	Region
// 	Properties: {
// 		FunctionName: GetAtt ctx.name, 'Arn'
// 		Action:		'lambda:InvokeFunction'
// 		Principal:	'elasticloadbalancing.amazonaws.com'
// 		SourceArn:	Sub "arn:${AWS::Partition}:elasticloadbalancing:${AWS::Region}:${AWS::AccountId}:targetgroup/#{ targetGroupName }/*"
// 	}
// }

// ctx.addResource "#{ ctx.name }ElbListenerRule#{ postfix }", {
// 	Type: 'AWS::ElasticLoadBalancingV2::ListenerRule'
// 	Region
// 	Properties: {
// 		Actions: [{
// 			Type: 'forward'
// 			TargetGroupArn: Ref "#{ ctx.name }ElbTargetGroup#{ postfix }"
// 		}]
// 		Conditions: conditions ctx
// 		ListenerArn: listener
// 		Priority: priority
// 	}
// }

// ctx.addResource "#{ ctx.name }ElbTargetGroup#{ postfix }", {
// 	Type: 'AWS::ElasticLoadBalancingV2::TargetGroup'
// 	Region
// 	DependsOn: [
// 		"#{ ctx.name }ElbLambdaPermission#{ postfix }"
// 	]
// 	Properties: {
// 		Name: targetGroupName
// 		TargetType: 'lambda'
// 		Targets: [
// 			{ Id: GetAtt ctx.name, 'Arn' }
// 		]
// 	}
// }


// LoadBalancer:
//   Type: AWS::ElasticLoadBalancingV2::LoadBalancer
//   Properties:
//     Name: elb-api
//     Scheme: internet-facing
//     Type: application
//     Subnets:
//       - !ImportValue SubnetA
//       - !ImportValue SubnetB
//       - !ImportValue SubnetC
//     SecurityGroups:
//       - !Ref SecurityGroup

// Listener:
//   Type: AWS::ElasticLoadBalancingV2::Listener
//   Properties:
//     LoadBalancerArn: !Ref LoadBalancer
//     Port: 443
//     Protocol: HTTPS
//     Certificates:
//       - CertificateArn: !ImportValue Certifcate2Arn

//     DefaultActions:
//       - Type: fixed-response
//         FixedResponseConfig:
//           ContentType: application/json
//           MessageBody: '"OK"'
//           StatusCode: 200








// SecurityGroup:
// Type: AWS::EC2::SecurityGroup
// Properties:
//   GroupDescription: Allow http on port 443
//   VpcId: !ImportValue VPC
//   SecurityGroupIngress:
// 	- IpProtocol: tcp
// 	  FromPort: 443
// 	  ToPort: 443
// 	  CidrIp: 0.0.0.0/0



// Route53Record:
// 	Type: AWS::Route53::RecordSet
// 	Properties:
// 	HostedZoneName: ${ssm:domain}.
// 	Name: elb.${ssm:domain}.
// 	Type: A
// 	AliasTarget:
// 		DNSName: !GetAtt LoadBalancer.DNSName
// 		HostedZoneId: !GetAtt LoadBalancer.CanonicalHostedZoneID

// MirrorRoute53Record:
// 	Type: AWS::Route53::RecordSet
// 	Properties:
// 	HostedZoneName: ${ssm:mirror}.
// 	Name: elb.${ssm:mirror}.
// 	Type: A
// 	AliasTarget:
// 		DNSName: !GetAtt LoadBalancer.DNSName
// 		HostedZoneId: !GetAtt LoadBalancer.CanonicalHostedZoneID
