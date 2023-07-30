
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { toExportName, toId } from '../util/resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toFunction } from './function/index.js';
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationListener, ApplicationListenerRule, ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, ListenerAction, ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HostedZone, RecordSet, RecordType, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { CfnOutput, Fn, Token } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { paramCase } from 'change-case';
import { debug } from '../cli/logger.js';

type Method = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'
type Route = `${Method} /${string}`

const RouteSchema = z.custom<Route>((route) => {
	return z.string()
		.regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/]*)$/ig)
		.safeParse(route).success
}, 'Invalid route')

const generatePriority = (id: string, route: string) => {
	const start = parseInt(Buffer.from(id, 'utf8').toString('hex'), 16) % 500 + 1
	const end = parseInt(Buffer.from(route, 'utf8').toString('hex'), 16) % 100

	debug('PRIORITY', id, start, route, end, parseInt(`${start}${end}`, 10))

	return parseInt(`${start}${end}`, 10)
	// (499 % 500) + (499 % 1000)
}

export const httpPlugin = definePlugin({
	name: 'http',
	schema: z.object({
		defaults: z.object({
			http: z.record(
				ResourceIdSchema,
				z.object({
					domain: z.string(),
					subDomain: z.string(),
				}),
			).optional()
		}).default({}),
		stacks: z.object({
			http: z.record(
				ResourceIdSchema,
				z.record(RouteSchema, FunctionSchema),
			).optional()
		}).array()
	}),
	onBootstrap({ stack, config }) {
		const vpc = new Vpc(stack, toId('vpc', 'http'), {
			subnetConfiguration: [{
				name: 'public',
				subnetType: SubnetType.PUBLIC,
				cidrMask: 24,
			}],
			availabilityZones: [
				config.region + 'a',
				config.region + 'b',
				config.region + 'c',
			]
		})

		// const zone = new HostedZone(stack, '', {
		// 	zoneName: ''
		// })

		// MainDomain:
		// Type: AWS::Route53::HostedZone
		// Region: us-east-1
		// Properties:
		//   Name: !ssm domain

		const securityGroup = new SecurityGroup(stack, toId('security-group', 'http'), {
			vpc,
		})

		securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443))
		securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443))

		new CfnOutput(stack, toId('output', 'http-vpc'), {
			exportName: 'http-vpc-id',
			value: vpc.vpcId,
		})

		new CfnOutput(stack, toId('output', 'http-security-group'), {
			exportName: 'http-security-group-id',
			value: securityGroup.securityGroupId,
		})

		Object.entries(config.defaults?.http || {}).forEach(([ id, props ]) => {
			const loadBalancer = new ApplicationLoadBalancer(stack, toId('load-balancer', id), {
				vpc,
				securityGroup
			})

			const zone = HostedZone.fromHostedZoneAttributes(
				stack,
				toId('hosted-zone', id),
				{
					// hostedZoneId: Fn.importValue(toExportName(`hosted-zone-${props.domain}-id`)),
					// hostedZoneId: Token.asString(Fn.ref(toId('hosted-zone', props.domain))),
					hostedZoneId: Token.asString(Fn.ref(toId('hosted-zone', props.domain))),
					zoneName: props.domain + '.',
				}
			)

			const certificate = Certificate.fromCertificateArn(
				stack,
				toId('certificate', id),
				Token.asString(Fn.ref(toId('certificate', props.domain)))
			)

			const target = RecordTarget.fromAlias(new LoadBalancerTarget(loadBalancer))
			const recordName = props.subDomain ? `${props.subDomain}.${props.domain}` : props.domain

			new RecordSet(stack, toId('record-set', id), {
				zone,
				target,
				recordName,
				recordType: RecordType.A,
			})

			const listener = loadBalancer.addListener(toId('listener', id), {
				port: 443,
				protocol: ApplicationProtocol.HTTPS,
				certificates: [ certificate ],
				defaultAction: ListenerAction.fixedResponse(404, {
					contentType: 'application/json',
					messageBody: JSON.stringify({
						message: 'Route not found'
					}),
				})
			})

			new CfnOutput(stack, toId('output', `http-${id}-listener`), {
				exportName: `http-${id}-listener-arn`,
				value: listener.listenerArn
			})
		})
	},
	onStack(ctx) {
		const { config, stack, stackConfig } = ctx

		return Object.entries(stackConfig.http || {}).map(([ id, routes ]) => {

			const listener = ApplicationListener.fromApplicationListenerAttributes(stack, toId('listener', id), {
				listenerArn: Fn.importValue(`http-${id}-listener-arn`),
				securityGroup: SecurityGroup.fromLookupById(
					stack,
					toId('security-group', id),
					'http-security-group-id'
				),
			})

			return Object.entries(routes).map(([ route, props ]) => {
				const lambda = toFunction(ctx as any, paramCase(route), props!)

				const [ method, ...paths ] = route.split(' ')
				const path = paths.join(' ')

				new ApplicationListenerRule(stack, toId('listener-rule', route), {
					listener,
					priority: generatePriority(id, route),
					action: ListenerAction.forward([
						new ApplicationTargetGroup(stack, toId('target-group', route), {
							targets: [ new LambdaTarget(lambda) ],
						})
					]),
					conditions: [
						ListenerCondition.httpRequestMethods([ method ]),
						ListenerCondition.pathPatterns([ path ]),
					]
				})

				// if(method !== '*') {
				// 	rule.addCondition(ListenerCondition.httpRequestMethods([ method ]))
				// }

				// if(path !== '') {
				// 	rule.addCondition(ListenerCondition.pathPatterns([ path ]))
				// }

				return lambda
			})
		}).flat()
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
