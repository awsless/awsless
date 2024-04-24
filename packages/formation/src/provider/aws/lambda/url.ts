import { constantCase } from 'change-case'
import { Duration, toSeconds } from '@awsless/duration'
import { ARN } from '../types.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Node } from '../../../core/node.js'

export type UrlProps = {
	targetArn: Input<ARN>
	qualifier?: Input<string>
	invokeMode?: Input<'buffered' | 'response-stream'>
	authType?: Input<'aws-iam' | 'none'>
	cors?: Input<{
		allow?: Input<{
			credentials?: Input<boolean>
			headers?: Input<Input<string>[]>
			methods?: Input<Input<string>[]>
			origins?: Input<Input<string>[]>
		}>
		expose?: Input<{
			headers?: Input<Input<string>[]>
		}>
		maxAge?: Input<Duration>
	}>
}

export class Url extends CloudControlApiResource {
	constructor(readonly parent: Node, id: string, private props: UrlProps) {
		super(parent, 'AWS::Lambda::Url', id, props)
	}

	get url() {
		return this.output<string>(v => v.FunctionUrl)
	}

	get domain() {
		return this.url.apply(url => url.split('/')[2])
	}

	protected cors() {
		const cors = unwrap(this.props.cors)

		if (!cors) {
			return {}
		}

		const allow = unwrap(cors.allow, {})
		const expose = unwrap(cors.expose, {})

		return {
			...this.attr('AllowCredentials', allow.credentials),
			...this.attr('AllowHeaders', allow.headers),
			...this.attr('AllowMethods', allow.methods),
			...this.attr('AllowOrigins', allow.origins),
			...this.attr('ExposeHeaders', expose.headers),
			...this.attr('MaxAge', cors.maxAge, toSeconds),
		}
	}

	toState() {
		return {
			document: {
				AuthType: constantCase(unwrap(this.props.authType, 'none')),
				InvokeMode: constantCase(unwrap(this.props.invokeMode, 'buffered')),
				TargetFunctionArn: this.props.targetArn,
				...this.attr('Qualifier', this.props.qualifier),
				Cors: this.cors(),
			},
		}
	}
}
