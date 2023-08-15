
import { z } from 'zod'
import { definePlugin } from '../../plugin.js';
import { toId, toName } from '../../util/__resource.js';
import { ResourceIdSchema } from '../../schema/resource-id.js';
import { FunctionSchema, toFunction } from '../function/index.js';
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationListener, ApplicationListenerRule, ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, ListenerAction, ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HostedZone, RecordSet, RecordType, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { CfnOutput, Fn, Token } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { paramCase } from 'change-case';
import { RouteSchema } from './schema/route.js';
import { generatePriority } from './util/priority.js';

export const httpPlugin = definePlugin({
	name: 'http',
	schema: z.object({
		defaults: z.object({
			http: z.record(
				ResourceIdSchema,
				z.object({
					domain: z.string(),
					subDomain: z.string().optional(),
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
		if(Object.keys(config.defaults?.http || {}).length === 0) {
			return
		}

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
			],
		})

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
				loadBalancerName: toName(stack, id),
				// ipAddressType: IpAddressType.DUAL_STACK,
				vpc,
				securityGroup
			})

			const zone = HostedZone.fromHostedZoneAttributes(
				stack,
				toId('hosted-zone', id),
				{
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
		const { stack, stackConfig } = ctx

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
					priority: generatePriority(stackConfig.name, route),
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

				return lambda
			})
		}).flat()
	},
})
