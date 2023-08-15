
export const globalExportsHandlerCode = /* JS */ `

const { Route53Client, ListResourceRecordSetsCommand, ChangeResourceRecordSetsCommand } = require('@aws-sdk/client-route-53')

const client = new Route53Client({})

exports.handler = async (event) => {
	const type = event.RequestType
	const hostedZoneId = event.ResourceProperties.hostedZoneId

	if(type === 'Delete') {
		const records = await listHostedZoneRecords(hostedZoneId)
		await deleteHostedZoneRecords(hostedZoneId, records)
		await send()
	}
}

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

const deleteHostedZoneRecords = async (hostedZoneId, records) => {
	const chunkSize = 100;
	for (let i = 0; i < records.length; i += chunkSize) {
		const chunk = records.slice(i, i + chunkSize);

		const result = await client.send(new ChangeResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			ChangeBatch: {
				Changes: chunk.map( record => ({
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

		// result.ResourceRecordSets?.forEach(item => {
		// 	if(item.Type === 'NS' || item.Type === 'SOA') {
		// 		return
		// 	}

		// 	records.push({
		// 		Action: 'DELETE',
		// 		ResourceRecordSet: record,
		// 		// ResourceRecordSet: {
		// 		// 	'Name': record.Name,
		// 		// 	'Type': record.Type,
		// 		// 	'TTL': record.TTL,
		// 		// 	'ResourceRecords': [{
		// 		// 		'Value': record.ResourceRecords[0].Value
		// 		// 	}]
		// 		// }
		// 	})
		// })

		if(result.NextRecordName) {
			token = result.NextRecordName
		} else {
			return records
		}
	}
}
`
