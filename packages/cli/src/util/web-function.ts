import {
	DeleteWebFunctionRevisionCommand,
	GetWebFunctionEndpointCommand,
	GetWebFunctionRevisionCommand,
	LambdaWebClient,
	UpdateWebFunctionEndpointCommand,
	waitUntilWebFunctionEndpointUpdated,
} from '@aws-sdk/client-lambda-web'
import { isError } from './aws.js'

// An endpoint update goes live once its status is Successful.
const UPDATE_WAIT_SECONDS = 300

/** The revision an endpoint sends its traffic to, if it exists & has one. */
export const getEndpointRevisionId = async (client: LambdaWebClient, functionName: string, endpointName: string) => {
	try {
		const endpoint = await client.send(new GetWebFunctionEndpointCommand({ functionName, endpointName }))

		return endpoint.revisionWeights?.find(item => item.weight === 100)?.revisionId
	} catch (error) {
		if (isError(error, 'ResourceNotFoundException')) {
			return undefined
		}

		throw error
	}
}

/** Whether a revision still exists, as prune deletes a pruned deployment's. */
export const hasWebFunctionRevision = async (client: LambdaWebClient, functionName: string, revisionId: string) => {
	try {
		await client.send(new GetWebFunctionRevisionCommand({ functionName, revisionId }))

		return true
	} catch (error) {
		if (isError(error, 'ResourceNotFoundException')) {
			return false
		}

		throw error
	}
}

/** Deletes a revision no endpoint serves; a revision that's gone already is fine. */
export const pruneWebFunctionRevision = async (client: LambdaWebClient, functionName: string, revisionId: string) => {
	try {
		await client.send(new DeleteWebFunctionRevisionCommand({ functionName, revisionId }))
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}
	}
}

/** Sends all of an endpoint's traffic to one revision, & waits until it's live. */
export const setEndpointRevisionId = async (
	client: LambdaWebClient,
	functionName: string,
	endpointName: string,
	revisionId: string
) => {
	await client.send(
		new UpdateWebFunctionEndpointCommand({
			functionName,
			endpointName,
			revisionWeights: [{ revisionId, weight: 100 }],
		})
	)

	await waitUntilWebFunctionEndpointUpdated(
		{ client, maxWaitTime: UPDATE_WAIT_SECONDS },
		{ functionName, endpointName }
	)
}
