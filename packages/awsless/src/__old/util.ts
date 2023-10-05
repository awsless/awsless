
export const sendCode = /* JS */ `

const send = async (event, id, status, data, reason = '') => {
	const body = JSON.stringify({
		Status: status,
		Reason: reason,
		PhysicalResourceId: id,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		NoEcho: false,
		Data: data
	})

	await fetch(event.ResponseURL, {
		method: 'PUT',
		port: 443,
		body,
		headers: {
			'content-type': '',
            'content-length': Buffer.from(body).byteLength,
		},
	})
}

`
