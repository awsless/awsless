import { Input } from '../../../core/output'

export type HttpRequestMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type HttpRequestMethodsProps = {
	methods: Input<Input<HttpRequestMethod>[]>
}

export type PathPatternProps = {
	paths: Input<Input<string>[]>
}

export abstract class ListenerCondition {
	static httpRequestMethods(methods: HttpRequestMethodsProps['methods']) {
		return new HttpRequestMethods({ methods })
	}

	static pathPatterns(paths: PathPatternProps['paths']) {
		return new PathPattern({ paths })
	}

	abstract toJSON(): object
}

export class HttpRequestMethods extends ListenerCondition {
	constructor(private props: HttpRequestMethodsProps) {
		super()
	}

	toJSON() {
		return {
			Field: 'http-request-method',
			HttpRequestMethodConfig: {
				Values: this.props.methods,
			},
		}
	}
}

export class PathPattern extends ListenerCondition {
	constructor(private props: PathPatternProps) {
		super()
	}

	toJSON() {
		return {
			Field: 'path-pattern',
			PathPatternConfig: {
				Values: this.props.paths,
			},
		}
	}
}
