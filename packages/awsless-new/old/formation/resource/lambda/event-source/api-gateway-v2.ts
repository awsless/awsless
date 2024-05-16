import { Group } from '../../../resource.js'
import { formatName, sub } from '../../../util.js'
import { Integration } from '../../api-gateway-v2/integration.js'
import { Route } from '../../api-gateway-v2/route.js'
import { Function } from '../function.js'
import { Permission } from '../permission.js'

export class ApiGatewayV2EventSource extends Group {
	constructor(
		id: string,
		lambda: Function,
		props: {
			apiId: string
			routeKey: string
		}
	) {
		const name = formatName(id)
		const permission = new Permission(id, {
			action: 'lambda:InvokeFunction',
			principal: 'apigateway.amazonaws.com',
			functionArn: lambda.arn,
		}).dependsOn(lambda)

		const integration = new Integration(id, {
			apiId: props.apiId,
			description: name,
			method: 'POST',
			payloadFormatVersion: '2.0',
			type: 'AWS_PROXY',
			uri: sub(
				'arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${lambda}/invocations',
				{
					lambda: lambda.arn,
				}
			),
		})

		const route = new Route(id, {
			apiId: props.apiId,
			routeKey: props.routeKey,
			target: sub('integrations/${id}', { id: integration.id }),
		}).dependsOn(lambda, permission, integration)

		super([integration, route, permission])
	}
}
