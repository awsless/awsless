import { Resource } from "../../resource";
import { getAtt, ref } from "../../util";
import { ListenerAction } from "./listener";

export class ListenerRule extends Resource {
	constructor(logicalId: string, private props: {
		listenerArn: string
		priority: number
		conditions: ListenerCondition[]
		actions: ListenerAction[]
	}) {
		super('AWS::ElasticLoadBalancingV2::ListenerRule', logicalId)
	}

	get id() {
		return ref(this.logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'ListenerArn')
	}

	properties() {
		return {
			ListenerArn: this.props.listenerArn,
			Priority: this.props.priority,
			Conditions: this.props.conditions.map(condition => condition.toJSON()),
			Actions: this.props.actions.map(action => action.toJSON()),
		}
	}
}

export type HttpRequestMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS'

export class ListenerCondition {
	static httpRequestMethods(methods:HttpRequestMethod[]) {
		return new ListenerCondition({
			field: 'http-request-method',
			methods,
		})
	}

	static pathPatterns(paths: string[]) {
		return new ListenerCondition({
			field: 'path-pattern',
			paths,
		})
	}

	constructor(private props: {
		field: 'http-request-method'
		methods: HttpRequestMethod[]
	} | {
		field: 'path-pattern'
		paths: string[]
	}) {}

	toJSON() {
		return {
			Field: this.props.field,
			...(this.props.field === 'http-request-method' ? {
				HttpRequestMethodConfig: {
					Values: this.props.methods
				},
			} : {}),
			...(this.props.field === 'path-pattern' ? {
				PathPatternConfig: {
					Values: this.props.paths
				},
			} : {}),
		}
	}
}
