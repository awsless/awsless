import { CloudFormationCustomResourceEvent } from 'aws-lambda'
import { Route53Client, ListResourceRecordSetsCommand, ChangeResourceRecordSetsCommand, ResourceRecordSet } from '@aws-sdk/client-route-53'
import { send } from '../util.js';
import chunk from 'chunk'

const client = new Route53Client({})

export const handler = async (event: CloudFormationCustomResourceEvent) => {
	const type = event.RequestType
	const hostedZoneId = event.ResourceProperties.hostedZoneId

	console.log('Type:', type)
	console.log('HostedZoneId:', hostedZoneId)

	try {
		if(type === 'Delete') {
			const records = await listHostedZoneRecords(hostedZoneId)

			console.log('Records:', records)

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

		console.error(error);
	}
}

const deleteHostedZoneRecords = async (hostedZoneId: string, records: ResourceRecordSet[]) => {
	records = records.filter(record => ![ 'SOA', 'NS' ].includes(record.Type!))

	if(records.length === 0) {
		return
	}

	await Promise.all(chunk(records, 100).map(async records => {
		await client.send(new ChangeResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			ChangeBatch: {
				Changes: records.map(record => ({
					Action: 'DELETE',
					ResourceRecordSet: record
				}))
			}
		}))
	}))
}

const listHostedZoneRecords = async (hostedZoneId: string) => {
	const records = []
	let token: string | undefined

	while(true) {
		const result = await client.send(new ListResourceRecordSetsCommand({
			HostedZoneId: hostedZoneId,
			StartRecordName: token,
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
