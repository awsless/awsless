import { Resource } from '../../resource.js'
import { getAtt } from '../../util.js'

export type CustomResourceProps = {
	serviceToken: string
	properties: Record<string, unknown>
}

export class CustomResource extends Resource {
	constructor(logicalId: string, private props: CustomResourceProps) {
		super('AWS::CloudFormation::CustomResource', logicalId)
	}

	getAtt<T = string>(name: string) {
		return getAtt(this.logicalId, name) as T
	}

	protected properties() {
		return {
			ServiceToken: this.props.serviceToken,
			...this.props.properties,
		}
	}
}

// import { CustomResource, Fn, Stack, Token } from 'aws-cdk-lib';
// import { Construct } from 'constructs';
// import { Region } from '../../schema/region';
// import { CfnFunction, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
// // import { Provider } from 'aws-cdk-lib/custom-resources';
// import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
// // import { RetentionDays } from 'aws-cdk-lib/aws-logs';
// import { toId } from '../../util/__resource';
// import { globalExportsHandlerCode } from './handler';

// const name = 'global-exports'

// export class GlobalExports extends Construct {

// 	// readonly name = 'global-exports'
// 	readonly resource: CustomResource;

// 	static create(stack: Stack) {
// 		const handler = new Function(stack, toId('function', name), {
// 			functionName: `custom-resource-${name}`,
// 			runtime: Runtime.NODEJS_18_X,
// 			code: Code.fromInline(globalExportsHandlerCode),
// 			handler: 'index.handler',
// 		})

// 		// debug('CREATEEEE', handler.node.defaultChild);

// 		;(handler.node.defaultChild as CfnFunction).overrideLogicalId(toId('function', name))

// 		// const provider = new Provider(stack, toId('provider', name), {
// 		// 	onEventHandler: handler,
// 		// 	logRetention: RetentionDays.ONE_DAY,
// 		// })

// 		// ;(provider.node.defaultChild as CfnResource).overrideLogicalId(toId('provider', name))

// 		handler.addToRolePolicy(new PolicyStatement({
// 			actions: [ 'cloudformation:ListExports' ],
// 			resources: [ '*' ],
// 		}))

// 		// new CfnOutput(stack, toId('output', name), {
// 		// 	exportName: toExportName(`custom-resource-${name}`),
// 		// 	value: provider.serviceToken,
// 		// })
// 	}

// 	constructor(scope: Construct, id: string, region: Region) {
// 		super(scope, id)

// 		// const handler = Function.fromFunctionArn(
// 		// 	this,
// 		// 	toId('function', this.name),
// 		// 	Token.asString(Fn.getAtt(toId('function', this.name), 'Arn')),
// 		// )

// 		// const provider = new Provider(this, toId('provider', this.name), {
// 		// 	onEventHandler: handler,
// 		// 	// logRetention: RetentionDays.ONE_DAY,
// 		// })

// 		this.resource = new CustomResource(this, toId('custom', name), {
// 			// serviceToken: Fn.importValue(toExportName(`custom-resource-token-${name}`)),
// 			// serviceToken: provider.serviceToken,
// 			serviceToken: Token.asString(Fn.getAtt(toId('function', name), 'Arn')),
// 			properties: { region },
// 		})
// 	}

// 	importValue(key: string) {
// 		return this.resource.getAttString(key)
// 	}
// }

// // function randomString() {
// // 	// Crazy
// // 	return Math.random().toString(36).replace(/[^a-z0-9]+/g, '')
// // }

// // import { CfnOutput, CfnResource, CustomResource, CustomResourceProvider, Fn, Stack, Token } from 'aws-cdk-lib';
// // import { Construct } from 'constructs';
// // import { Region } from '../../schema/region';
// // import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
// // import { Provider } from 'aws-cdk-lib/custom-resources';
// // import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
// // import { RetentionDays } from 'aws-cdk-lib/aws-logs';
// // import { toExportName, toId } from '../../util/resource';
// // import { globalExportsHandlerCode } from './handler';

// // export class GlobalExports extends Construct {

// // 	readonly name = 'global-exports'
// // 	readonly resource: CustomResource

// // 	constructor(scope: Construct, id: string, region: Region) {
// // 		super(scope, id)

// // 		const handler = new Function(this, toId('function', this.name), {
// // 			functionName: `custom-resource-${this.name}`,
// // 			runtime: Runtime.NODEJS_18_X,
// // 			code: Code.fromInline(globalExportsHandlerCode),
// // 			handler: 'global-exports.default',
// // 		})

// // 		handler.addToRolePolicy(new PolicyStatement({
// // 			actions: [ 'cloudformation:ListExports' ],
// // 			resources: [ '*' ],
// // 		}))

// // 		const provider = new Provider(this, toId('provider', this.name), {
// // 			onEventHandler: handler,
// // 			logRetention: RetentionDays.ONE_DAY,
// // 		})

// // 		this.resource = new CustomResource(this, toId('custom', this.name), {
// // 			// serviceToken: Fn.importValue(toExportName(`custom-resource-token-${this.name}`)),
// // 			serviceToken: provider.serviceToken,
// // 			properties: { region },
// // 		})
// // 	}

// // 	get(key: string) {
// // 		return this.resource.getAttString(key)
// // 	}
// // }

// // // function randomString() {
// // // 	// Crazy
// // // 	return Math.random().toString(36).replace(/[^a-z0-9]+/g, '')
// // // }
