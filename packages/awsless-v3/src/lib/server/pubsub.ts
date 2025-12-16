import { Duration, hours, toSeconds } from '@awsless/duration'
import { publish, QoS } from '@awsless/iot'
import { stringify } from '@awsless/json'
import { IoTCustomAuthorizerResult, PolicyDocument } from 'aws-lambda'
import { APP } from './util.js'

export const getPubSubTopic = <N extends string>(name: N) => {
	return `${APP}/pubsub/${name}` as const
}

export { QoS }

export type PublishOptions = {
	qos?: QoS
}

export const PubSub = {
	async publish(topic: string, event: string, payload: unknown, opts: PublishOptions = {}) {
		await publish({
			topic: getPubSubTopic(topic),
			payload: Buffer.from(stringify([event, payload])),
			...opts,
		})
	},
}

type PubsubAuthorizerResponse = {
	authorized: boolean
	principalId?: string
	publish?: string[]
	subscribe?: string[]
	disconnectAfter?: Duration
	refreshAfter?: Duration
}

type PubsubAuthorizerEvent = {
	protocolData: {
		mqtt?: {
			password?: string
		}
	}
}

export const pubsubAuthorizerHandle = async (
	cb: (token: string) => PubsubAuthorizerResponse | Promise<PubsubAuthorizerResponse>
) => {
	return async (event: PubsubAuthorizerEvent) => {
		const token = Buffer.from(event.protocolData.mqtt?.password ?? '', 'base64').toString()
		const response = await cb(token)

		return pubsubAuthorizerResponse(response)
	}
}

export const pubsubAuthorizerResponse = (props: PubsubAuthorizerResponse): IoTCustomAuthorizerResult => {
	const region = process.env.AWS_REGION
	const accountId = process.env.AWS_ACCOUNT_ID
	const prefix = `arn:aws:iot:${region}:${accountId}`
	const statements: {
		Action: string
		Effect: 'Allow'
		Resource: string[]
	}[] = []

	if (props.publish) {
		statements.push({
			Action: 'iot:Publish',
			Effect: 'Allow',
			Resource: props.publish.map(topic => {
				return `${prefix}:topic/${getPubSubTopic(topic)}`
			}),
		})
	}

	if (props.subscribe) {
		statements.push(
			{
				Action: 'iot:Subscribe',
				Effect: 'Allow',
				Resource: props.subscribe.map(topic => {
					return `${prefix}:topicfilter/${getPubSubTopic(topic)}`
				}),
			}
			// {
			// 	Action: 'iot:Receive',
			// 	Effect: 'Allow',
			// 	Resource: props.subscribe.map(topic => {
			// 		return `${prefix}:topic/${getPubSubTopic(topic)}`
			// 	}),
			// }
		)
	}

	const policyDocuments: PolicyDocument[] = [
		{
			Version: '2012-10-17',
			Statement: [
				{
					Action: 'iot:Connect',
					Effect: 'Allow',
					Resource: '*',
					// Resource: `${prefix}:client/\${iot:ClientId}`,
				},
				{
					Action: 'iot:Receive',
					Effect: 'Allow',
					Resource: '*',
					// Resource: `${prefix}:client/\${iot:ClientId}`,
				},
				...statements,
			],
		},
	]

	const documentSize = JSON.stringify(policyDocuments).length

	if (documentSize > 2048) {
		throw new Error(`IoT policy document size can't exceed 2048 characters. Current size is ${documentSize}`)
	}

	return {
		isAuthenticated: props.authorized,
		principalId: props.principalId ?? Date.now().toString(),
		disconnectAfterInSeconds: toSeconds(props.disconnectAfter ?? hours(1)),
		refreshAfterInSeconds: toSeconds(props.disconnectAfter ?? hours(1)),
		policyDocuments,
	}
}
