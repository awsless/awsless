import { DescribeEndpointCommand, IoTClient } from '@aws-sdk/client-iot'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, GetProps } from '../../../core/cloud'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	endpointType: 'iot:Data' | 'iot:Data-ATS' | 'iot:CredentialProvider' | 'iot:Jobs'
}

export class EndpointProvider implements CloudProvider {
	protected client: IoTClient

	constructor(props: ProviderProps) {
		this.client = new IoTClient(props)
	}

	own(id: string) {
		return id === 'aws-iot-endpoint'
	}

	async get({ document }: GetProps<Document>) {
		const result = await this.client.send(
			new DescribeEndpointCommand({
				endpointType: document.endpointType,
			})
		)

		return {
			address: result.endpointAddress,
		}
	}

	async create() {
		return 'endpoint'
	}

	async update() {
		return 'endpoint'
	}

	async delete() {}
}
