import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'
import { getAtt } from '../../util.js'
import { constantCase } from 'change-case'

export type UrlProps = {
	target: string
	qualifier?: string
	invokeMode?: 'buffered' | 'response-stream'
	authType?: 'aws-iam' | 'none'
	cors?: {
		allow?: {
			credentials?: boolean
			headers?: string[]
			methods?: string[]
			origins?: string[]
		}
		expose?: {
			headers?: string[]
		}
		maxAge?: Duration
	}
}

export class Url extends Resource {
	constructor(logicalId: string, private props: UrlProps) {
		super('AWS::Lambda::Url', logicalId)
	}

	get url() {
		return getAtt(this.logicalId, 'FunctionUrl')
	}

	protected properties() {
		return {
			AuthType: constantCase(this.props.authType ?? 'none'),
			InvokeMode: constantCase(this.props.invokeMode ?? 'buffered'),
			TargetFunctionArn: this.props.target,
			...this.attr('Qualifier', this.props.qualifier),
			Cors: {
				...this.attr('AllowCredentials', this.props.cors?.allow?.credentials),
				...this.attr('AllowHeaders', this.props.cors?.allow?.headers),
				...this.attr('AllowMethods', this.props.cors?.allow?.methods),
				...this.attr('AllowOrigins', this.props.cors?.allow?.origins),
				...this.attr('ExposeHeaders', this.props.cors?.expose?.headers),
				...this.attr('MaxAge', this.props.cors?.maxAge?.toSeconds()),
			},
		}
	}
}
