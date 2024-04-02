import { Duration, days, toSeconds } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { Input, unwrap } from '../../../core/output'

export class ResponseHeadersPolicy extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			// add?: Record<string, string | { value: string, override: boolean }>
			remove?: Input<Input<string>[]>
			cors?: Input<{
				override?: Input<boolean>
				maxAge?: Input<Duration>
				exposeHeaders?: Input<Input<string>[]>
				credentials?: Input<boolean>
				headers?: Input<Input<string>[]>
				origins?: Input<Input<string>[]>
				methods?: Input<
					Array<Input<'GET' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'ALL'>>
				>
			}>
			contentSecurityPolicy?: Input<{
				override?: Input<boolean>
				contentSecurityPolicy: Input<string>
			}>
			contentTypeOptions?: Input<{
				override?: Input<boolean>
			}>
			frameOptions?: Input<{
				override?: Input<boolean>
				frameOption?: Input<'deny' | 'same-origin'>
			}>
			referrerPolicy?: Input<{
				override?: Input<boolean>
				referrerPolicy?: Input<
					| 'no-referrer'
					| 'no-referrer-when-downgrade'
					| 'origin'
					| 'origin-when-cross-origin'
					| 'same-origin'
					| 'strict-origin'
					| 'strict-origin-when-cross-origin'
					| 'unsafe-url'
				>
			}>
			strictTransportSecurity?: Input<{
				maxAge?: Input<Duration>
				includeSubdomains?: Input<boolean>
				override?: Input<boolean>
				preload?: Input<boolean>
			}>
			xssProtection?: Input<{
				override?: Input<boolean>
				enable?: Input<boolean>
				modeBlock?: Input<boolean>
				reportUri?: Input<string>
			}>
		}
	) {
		super('AWS::CloudFront::ResponseHeadersPolicy', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	toState() {
		const remove = unwrap(this.props.remove, [])
		const cors = unwrap(this.props.cors, {})
		const contentSecurityPolicy = unwrap(this.props.contentSecurityPolicy)
		const contentTypeOptions = unwrap(this.props.contentTypeOptions, {})
		const frameOptions = unwrap(this.props.frameOptions, {})
		const referrerPolicy = unwrap(this.props.referrerPolicy, {})
		const strictTransportSecurity = unwrap(this.props.strictTransportSecurity, {})
		const xssProtection = unwrap(this.props.xssProtection, {})

		return {
			document: {
				ResponseHeadersPolicyConfig: {
					Name: this.props.name,
					...(remove.length > 0
						? {
								RemoveHeadersConfig: {
									Items: remove.map(value => ({
										Header: value,
									})),
								},
						  }
						: {}),
					CorsConfig: {
						OriginOverride: unwrap(cors.override, false),
						AccessControlAllowCredentials: unwrap(cors.credentials, false),
						AccessControlMaxAgeSec: toSeconds(unwrap(cors.maxAge, days(365))),
						AccessControlAllowHeaders: {
							Items: unwrap(cors.headers, ['*']),
						},
						AccessControlAllowMethods: {
							Items: unwrap(cors.methods, ['ALL']),
						},
						AccessControlAllowOrigins: {
							Items: unwrap(cors.origins, ['*']),
						},
						AccessControlExposeHeaders: {
							Items: unwrap(cors.exposeHeaders, ['*']),
						},
					},
					SecurityHeadersConfig: {
						...(contentSecurityPolicy
							? {
									ContentSecurityPolicy: {
										Override: unwrap(contentSecurityPolicy.override, false),
										ContentSecurityPolicy: unwrap(
											contentSecurityPolicy?.contentSecurityPolicy
										),
									},
							  }
							: {}),
						ContentTypeOptions: {
							Override: unwrap(contentTypeOptions.override, false),
						},
						FrameOptions: {
							Override: unwrap(frameOptions.override, false),
							FrameOption:
								unwrap(frameOptions.frameOption, 'same-origin') === 'same-origin'
									? 'SAMEORIGIN'
									: 'DENY',
						},
						ReferrerPolicy: {
							Override: unwrap(referrerPolicy.override, false),
							ReferrerPolicy: unwrap(referrerPolicy.referrerPolicy, 'same-origin'),
						},
						StrictTransportSecurity: {
							Override: unwrap(strictTransportSecurity.override, false),
							Preload: unwrap(strictTransportSecurity.preload, true),
							AccessControlMaxAgeSec: toSeconds(unwrap(strictTransportSecurity.maxAge, days(365))),
							IncludeSubdomains: unwrap(strictTransportSecurity.includeSubdomains, true),
						},
						XSSProtection: {
							Override: unwrap(xssProtection.override, false),
							ModeBlock: unwrap(xssProtection.modeBlock, true),
							Protection: unwrap(xssProtection.enable, true),
							...this.attr('ReportUri', unwrap(xssProtection.reportUri)),
						},
					},
				},
			},
		}
	}
}
