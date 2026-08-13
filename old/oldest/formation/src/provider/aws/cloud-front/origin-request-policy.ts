import { camelCase } from 'change-case'
import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class OriginRequestPolicy extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			cookie?: Input<{
				behavior: Input<'all' | 'all-except' | 'none' | 'whitelist'>
				values?: Input<Input<string>[]>
			}>
			header?: Input<{
				behavior: Input<
					'all-except' | 'all-viewer' | 'all-viewer-and-whitelist-cloud-front' | 'none' | 'whitelist'
				>
				values?: Input<Input<string>[]>
			}>
			query?: Input<{
				behavior: Input<'all' | 'all-except' | 'none' | 'whitelist'>
				values?: Input<Input<string>[]>
			}>
		}
	) {
		super(parent, 'AWS::CloudFront::OriginRequestPolicy', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	toState() {
		const cookie = unwrap(this.props.cookie)
		const header = unwrap(this.props.header)
		const query = unwrap(this.props.query)

		return {
			document: {
				OriginRequestPolicyConfig: {
					Name: this.props.name,
					CookiesConfig: {
						CookieBehavior: camelCase(unwrap(cookie?.behavior, 'all')),
						...this.attr('Cookies', cookie?.values),
					},
					HeadersConfig: {
						HeaderBehavior: camelCase(unwrap(header?.behavior, 'all-viewer')),
						...this.attr('Headers', header?.values),
					},
					QueryStringsConfig: {
						QueryStringBehavior: camelCase(unwrap(query?.behavior, 'all')),
						...this.attr('QueryStrings', query?.values),
					},
				},
			},
		}
	}
}
