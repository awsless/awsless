import { constantCase } from "change-case";
import { Resource } from '../../resource.js';
import { getAtt, ref } from '../../util.js';
import { Duration } from "../../property/duration.js";

export class Listener extends Resource {
	constructor(logicalId: string, private props: {
		loadBalancerArn: string
		port: number
		protocol: 'http' | 'https' | 'geneve' | 'tcp' | 'tcp-udp' | 'tls' | 'udp'
		certificates: string[]
		defaultActions?: ListenerAction[]
	}) {
		super('AWS::ElasticLoadBalancingV2::Listener', logicalId)
	}

	get id() {
		return ref(this.logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'ListenerArn')
	}

	properties() {
		return {
			LoadBalancerArn: this.props.loadBalancerArn,
			Port: this.props.port,
			Protocol: constantCase(this.props.protocol),
			Certificates: this.props.certificates.map(arn => ({
				CertificateArn: arn,
			})),
			...this.attr('DefaultActions', this.props.defaultActions?.map((action, i) => {
				return {
					Order: i + 1,
					...action.toJSON()
				}
			})),
		}
	}
}

export type ContentType = 'text/plain' | 'text/css' | 'text/html' | 'application/javascript' | 'application/json'

export class ListenerAction {

	static authCognito(props: {
		onUnauthenticated?: 'allow' | 'authenticate' | 'deny'
		scope?: string
		session?: {
			cookieName?: string
			timeout?: Duration
		}
		userPool: {
			arn: string
			clientId: string
			domain: string
		}
	}) {
		return new ListenerAction({
			type: 'authenticate-cognito',
			...props,
		})
	}

	static fixedResponse(statusCode:number, props: {
		contentType?: ContentType
		messageBody?: string
	} = {}) {
		return new ListenerAction({
			type: 'fixed-response',
			fixedResponse: {
				statusCode,
				...props,
			},
		})
	}

	static forward(targets: string[]) {
		return new ListenerAction({
			type: 'forward',
			forward: {
				targetGroups: targets
			}
		})
	}

	constructor(private props: {
		// type: 'authenticate-cognito' | 'authenticate-oidc' | 'fixed-response' | 'forward' | 'redirect'
		// order?: number
		type: 'fixed-response'
		fixedResponse: {
			contentType?: ContentType
			messageBody?: string
			statusCode: number
		},
	} | {
		type: 'forward'
		forward: {
			targetGroups: string[]
		}
	} | {
		type: 'authenticate-cognito'
		onUnauthenticated?: 'allow' | 'authenticate' | 'deny'
		scope?: string
		session?: {
			cookieName?: string
			timeout?: Duration
		}
		userPool: {
			arn: string
			clientId: string
			domain: string
		}
	}) {}

	toJSON() {
		return {
			// AuthenticateCognitoConfig: AuthenticateCognitoConfig,
			// AuthenticateOidcConfig: AuthenticateOidcConfig,
			// RedirectConfig: RedirectConfig,
			Type: this.props.type,
			// Order: Integer,
			...(this.props.type === 'fixed-response' ? {
				FixedResponseConfig: {
					StatusCode: this.props.fixedResponse.statusCode,
					...(this.props.fixedResponse.contentType ? {
						ContentType: this.props.fixedResponse.contentType,
					} : {}),
					...(this.props.fixedResponse.messageBody ? {
						MessageBody: this.props.fixedResponse.messageBody,
					} : {})
				},
			} : {}),
			...(this.props.type === 'forward' ? {
				ForwardConfig: {
					TargetGroups: this.props.forward.targetGroups.map(target => ({
						TargetGroupArn: target,
					}))
				},
			} : {}),
			...(this.props.type === 'authenticate-cognito' ? {
				AuthenticateCognitoConfig: {
					OnUnauthenticatedRequest: this.props.onUnauthenticated ?? 'deny',
					Scope: this.props.scope ?? 'openid',
					SessionCookieName: this.props.session?.cookieName ?? 'AWSELBAuthSessionCookie',
					SessionTimeout: this.props.session?.timeout?.toSeconds() ?? 604800,
					UserPoolArn: this.props.userPool.arn,
					UserPoolClientId: this.props.userPool.clientId,
					UserPoolDomain: this.props.userPool.domain,
				},
			} : {})
		}
	}
}
