// import { Asset } from '../../asset.js';
import { Asset } from '../../asset.js'
import { Resource } from '../../resource.js'
import { ICode } from './code.js'
// import { ICode } from './code.js';

export type ResolverProps = {
	apiId: string
	typeName: string
	fieldName: string
	functions: string[]
	code: ICode & Asset
	// dataSourceName: string
}

export class Resolver extends Resource {
	constructor(logicalId: string, private props: ResolverProps) {
		super('AWS::AppSync::Resolver', logicalId)
	}

	protected properties() {
		return {
			ApiId: this.props.apiId,
			Kind: 'PIPELINE',
			TypeName: this.props.typeName,
			FieldName: this.props.fieldName,
			PipelineConfig: {
				Functions: this.props.functions,
			},
			// DataSourceName: this.props.dataSourceName,
			...this.props.code.toCodeJson(),
			Runtime: {
				Name: 'APPSYNC_JS',
				RuntimeVersion: '1.0.0',
			},
		}
	}
}

// import { util } from '@aws-appsync/utils';

// export function request(ctx) {
//   return {
//     version: '2017-02-28',
//     operation: 'Query',
//     query: {
//       expression: 'pk = :pk',
//       expressionValues: {
//         ':pk': util.dynamodb.toDynamoDB(ctx.args.pk),
//       },
//     },
//   };
// }

// export function response(ctx) {
//   return ctx.result;
// }
