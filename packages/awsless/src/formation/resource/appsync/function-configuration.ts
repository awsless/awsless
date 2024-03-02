import { Asset } from '../../asset.js'
import { Resource } from '../../resource.js'
import { ICode } from './code.js'
import { snakeCase } from 'change-case'

export type FunctionConfigurationProps = {
	apiId: string
	name?: string
	code: ICode & Asset
	dataSourceName: string
}

export class FunctionConfiguration extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: FunctionConfigurationProps) {
		super('AWS::AppSync::FunctionConfiguration', logicalId)

		this.name = snakeCase(this.props.name || logicalId)
	}

	get id() {
		return this.getAtt('FunctionId')
	}

	get arn() {
		return this.ref()
	}

	protected properties() {
		return {
			ApiId: this.props.apiId,
			Name: this.name,
			DataSourceName: this.props.dataSourceName,
			...this.props.code.toCodeJson(),

			FunctionVersion: '2018-05-29',
			Runtime: {
				Name: 'APPSYNC_JS',
				RuntimeVersion: '1.0.0',
			},
		}
	}
}
