import { CloudFormationCustomResourceEvent } from 'aws-lambda'

export const send = async (
	event: CloudFormationCustomResourceEvent,
	id: string,
	status: string,
	data?: object,
	reason = ''
) => {
	const body = JSON.stringify({
		Status: status,
		Reason: reason,
		PhysicalResourceId: id,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		NoEcho: false,
		Data: data,
	})

	await fetch(event.ResponseURL, {
		method: 'PUT',
		// @ts-ignore
		port: 443,
		body,
		headers: {
			'content-type': '',
			'content-length': Buffer.from(body).byteLength.toString(),
		},
	})
}
