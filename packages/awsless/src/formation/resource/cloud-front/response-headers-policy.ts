import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'
import { formatName, getAtt } from '../../util.js'

export class ResponseHeadersPolicy extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			// add?: Record<string, string | { value: string, override: boolean }>
			remove?: string[]
			cors?: {
				override?: boolean
				maxAge?: Duration
				exposeHeaders?: string[]
				credentials?: boolean
				headers?: string[]
				origins?: string[]
				methods?: Array<'GET' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'ALL'>
			}
			contentSecurityPolicy?: {
				override?: boolean
				contentSecurityPolicy: string
			}
			contentTypeOptions?: {
				override?: boolean
			}
			frameOptions?: {
				override?: boolean
				frameOption?: 'deny' | 'same-origin'
			}
			referrerPolicy?: {
				override?: boolean
				referrerPolicy?:
					| 'no-referrer'
					| 'no-referrer-when-downgrade'
					| 'origin'
					| 'origin-when-cross-origin'
					| 'same-origin'
					| 'strict-origin'
					| 'strict-origin-when-cross-origin'
					| 'unsafe-url'
			}
			strictTransportSecurity?: {
				maxAge?: Duration
				includeSubdomains?: boolean
				override?: boolean
				preload?: boolean
			}
			xssProtection?: {
				override?: boolean
				enable?: boolean
				modeBlock?: boolean
				reportUri?: string
			}
		}
	) {
		super('AWS::CloudFront::ResponseHeadersPolicy', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'Id')
	}

	protected properties() {
		return {
			ResponseHeadersPolicyConfig: {
				Name: this.name,
				...(this.props.remove && this.props.remove.length > 0
					? {
							RemoveHeadersConfig: {
								Items: this.props.remove?.map(value => ({
									Header: value,
								})),
							},
					  }
					: {}),
				CorsConfig: {
					OriginOverride: this.props.cors?.override ?? false,
					AccessControlAllowCredentials: this.props.cors?.credentials ?? false,
					AccessControlMaxAgeSec: this.props.cors?.maxAge?.toSeconds() ?? Duration.days(365).toSeconds(),
					AccessControlAllowHeaders: {
						Items: this.props.cors?.headers ?? ['*'],
					},
					AccessControlAllowMethods: {
						Items: this.props.cors?.methods ?? ['ALL'],
					},
					AccessControlAllowOrigins: {
						Items: this.props.cors?.origins ?? ['*'],
					},
					AccessControlExposeHeaders: {
						Items: this.props.cors?.exposeHeaders ?? ['*'],
					},
				},
				SecurityHeadersConfig: {
					...(this.props.contentSecurityPolicy
						? {
								ContentSecurityPolicy: {
									Override: this.props.contentSecurityPolicy?.override ?? false,
									ContentSecurityPolicy: this.props.contentSecurityPolicy?.contentSecurityPolicy,
								},
						  }
						: {}),
					ContentTypeOptions: {
						Override: this.props.contentTypeOptions?.override ?? false,
					},
					FrameOptions: {
						Override: this.props.frameOptions?.override ?? false,
						FrameOption:
							(this.props.frameOptions?.frameOption ?? 'same-origin') === 'same-origin'
								? 'SAMEORIGIN'
								: 'DENY',
					},
					ReferrerPolicy: {
						Override: this.props.referrerPolicy?.override ?? false,
						ReferrerPolicy: this.props.referrerPolicy?.referrerPolicy ?? 'same-origin',
					},
					StrictTransportSecurity: {
						Override: this.props.strictTransportSecurity?.override ?? false,
						Preload: this.props.strictTransportSecurity?.preload ?? true,
						AccessControlMaxAgeSec:
							this.props.strictTransportSecurity?.maxAge?.toSeconds() ?? 31536000,
						IncludeSubdomains: this.props.strictTransportSecurity?.includeSubdomains ?? true,
					},
					XSSProtection: {
						Override: this.props.xssProtection?.override ?? false,
						ModeBlock: this.props.xssProtection?.modeBlock ?? true,
						Protection: this.props.xssProtection?.enable ?? true,
						...this.attr('ReportUri', this.props.xssProtection?.reportUri),
					},
				},
			},
		}
	}
}
