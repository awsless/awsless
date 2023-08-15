
import { snakeCase } from "change-case";
import { Resource } from "../../resource";
import { ref } from "../../util";

export type DataSourceProps = {
	apiId: string
	type: 'AWS_LAMBDA' | 'NONE'
	name?: string
	description?: string
	serviceRoleArn?: string
	config?: {
		lambda?: {
			functionArn: string
		}
	}
}

export class DataSource extends Resource {

	static fromLambda(logicalId: string, apiId:string, props: {
		serviceRoleArn: string
		functionArn: string
	}) {
		return new DataSource(logicalId, {
			apiId,
			type: 'AWS_LAMBDA',
			serviceRoleArn: props.serviceRoleArn,
			config: {
				lambda: {
					functionArn: props.functionArn,
				}
			}
		})
	}

	static fromNone(logicalId: string, apiId:string) {
		return new DataSource(logicalId, {
			apiId,
			type: 'NONE',
		})
	}

	readonly name: string

	constructor(logicalId: string, private props: DataSourceProps) {
		super('AWS::AppSync::DataSource', logicalId)

		this.name = snakeCase(this.props.name || logicalId)
	}

	get arn() {
		return ref(this.logicalId)
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			Name: this.name,
			Type: this.props.type,
			ServiceRoleArn: this.props.serviceRoleArn,

			...(this.props.config?.lambda ? {
				LambdaConfig: {
					LambdaFunctionArn: this.props.config.lambda.functionArn,
				}
			} : {}),
		}
	}
}
