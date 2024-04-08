import { Duration, days, toSeconds } from '@awsless/duration'
import { Input, unwrap } from '../../../core/output'
import { ARN } from '../types'

export type ContentType = 'text/plain' | 'text/css' | 'text/html' | 'application/javascript' | 'application/json'

export type ForwardProps = {
	targetGroups: Input<Input<ARN>[]>
}

export type FixedResponseProps = {
	statusCode: Input<number>
	contentType?: Input<ContentType>
	messageBody?: Input<string>
}

export type AuthenticateCognitoProps = {
	onUnauthenticated?: Input<'allow' | 'authenticate' | 'deny'>
	scope?: Input<string>
	session?: Input<{
		cookieName?: Input<string>
		timeout?: Input<Duration>
	}>
	userPool: Input<{
		arn: Input<ARN>
		clientId: Input<string>
		domain: Input<string>
	}>
}

export abstract class ListenerAction {
	static authCognito(props: AuthenticateCognitoProps) {
		return new AuthCognitoAction(props)
	}

	static fixedResponse(props: FixedResponseProps) {
		return new FixedResponseAction(props)
	}

	static forward(targets: ForwardProps['targetGroups']) {
		return new ForwardAction({
			targetGroups: targets,
		})
	}

	abstract toJSON(): object
}

export class ForwardAction extends ListenerAction {
	constructor(private props: ForwardProps) {
		super()
	}

	toJSON() {
		return {
			Type: 'forward',
			ForwardConfig: {
				TargetGroups: unwrap(this.props.targetGroups).map(target => ({
					TargetGroupArn: target,
				})),
			},
		}
	}
}

export class FixedResponseAction extends ListenerAction {
	constructor(private props: FixedResponseProps) {
		super()
	}

	toJSON() {
		return {
			Type: 'fixed-response',
			FixedResponseConfig: {
				StatusCode: unwrap(this.props.statusCode).toString(),
				...(this.props.contentType ? { ContentType: this.props.contentType } : {}),
				...(this.props.messageBody ? { MessageBody: this.props.messageBody } : {}),
			},
		}
	}
}

export class AuthCognitoAction extends ListenerAction {
	constructor(private props: AuthenticateCognitoProps) {
		super()
	}

	toJSON() {
		const session = unwrap(this.props.session, {})
		const userPool = unwrap(this.props.userPool)

		return {
			Type: 'authenticate-cognito',
			AuthenticateCognitoConfig: {
				OnUnauthenticatedRequest: unwrap(this.props.onUnauthenticated, 'deny'),
				Scope: unwrap(this.props.scope, 'openid'),
				SessionCookieName: unwrap(session.cookieName, 'AWSELBAuthSessionCookie'),
				SessionTimeout: toSeconds(unwrap(session.timeout, days(7))),
				UserPoolArn: userPool.arn,
				UserPoolClientId: userPool.clientId,
				UserPoolDomain: userPool.domain,
			},
		}
	}
}
