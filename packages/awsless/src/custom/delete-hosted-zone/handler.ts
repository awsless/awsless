
export const deleteHostedZoneRecordsHandlerCode = /* JS */ `

const { Route53Client, ListResourceRecordSetsCommand, ChangeResourceRecordSetsCommand } = require('@aws-sdk/client-route-53')

const client = new Route53Client({})

exports.handler = async (event) => {
	const type = event.RequestType
	const hostedZoneId = event.ResourceProperties.hostedZoneId

	try {
		if(type === 'Delete') {
			const records = await listHostedZoneRecords(hostedZoneId)
			console.log(records)

			await deleteHostedZoneRecords(hostedZoneId, records)
		}

		await send(event, hostedZoneId, 'SUCCESS')
	}
	catch(error) {
		if (error instanceof Error) {
			await send(event, hostedZoneId, 'FAILED', {}, error.message)
		} else {
			await send(event, hostedZoneId, 'FAILED', {}, 'Unknown error')
		}
	}
}

const send = async (event, id, status, data = {}, reason = '') => {
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

const deleteHostedZoneRecords = async (hostedZoneId, records) => {
	records = records.filter(record => ![ 'SOA', 'NS' ].includes(record.Type))
	if(records.length === 0) {
		return
	}

	const chunkSize = 100;
	for (let i = 0; i < records.length; i += chunkSize) {
		const chunk = records.slice(i, i + chunkSize);

		await client.send(new ChangeResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			ChangeBatch: {
				Changes: chunk.map(record => ({
					Action: 'DELETE',
					ResourceRecordSet: record
				}))
			}
		}))
	}
}

const listHostedZoneRecords = async (hostedZoneId) => {

	const records = []
	let token

	while(true) {
		const result = await client.send(new ListResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			NextRecordName: token
		}))

		if(result.ResourceRecordSets && result.ResourceRecordSets.length) {
			records.push(...result.ResourceRecordSets)
		}

		if(result.NextRecordName) {
			token = result.NextRecordName
		} else {
			return records
		}
	}
}
`
