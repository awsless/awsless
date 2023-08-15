
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { DurationSchema } from '../schema/duration.js';
import { HostedZone } from '../formation/resource/route53/hosted-zone.js';
import { Certificate } from '../formation/resource/certificate-manager/certificate.js';
import { RecordSetGroup } from '../formation/resource/route53/record-set-group.js';

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

const DomainNameSchema = z.string().regex(/[a-z\-\_\.]/g, 'Invalid domain name')

export const domainPlugin = definePlugin({
	name: 'domain',
	schema: z.object({
		domains: z.record(DomainNameSchema, z.object({
			name: DomainNameSchema.optional(),
			type: z.enum([ 'A', 'AAAA', 'CAA', 'CNAME', 'DS', 'MX', 'NAPTR', 'NS', 'PTR', 'SOA', 'SPF', 'SRV', 'TXT' ]),
			ttl: DurationSchema,
			records: z.string().array(),
		}).array()).optional(),
	}),
	onApp({ config, bootstrap, usEastBootstrap }) {

		for(const [ domain, records ] of Object.entries(config.domains || {})) {
			const hostedZone = new HostedZone(domain)
			const certificate = new Certificate(domain, {
				alternativeNames: [ `*.${domain}` ]
			})

			// bootstrap.export(`certificate-${domain}-arn`, certificate.arn)
			// bootstrap.export(`hosted-zone-${domain}-id`, hostedZone.id)

			bootstrap.add(certificate)

			usEastBootstrap
				.add(hostedZone)
				.add(certificate)
				.export(`certificate-${domain}-arn`, certificate.arn)
				// .export(`hosted-zone-${domain}-id`, hostedZone.id)

			if(records.length > 0) {
				const group = new RecordSetGroup(domain, {
					hostedZoneId: hostedZone.id,
					records,
				}).dependsOn(hostedZone)

				usEastBootstrap.add(group)
			}
		}
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
