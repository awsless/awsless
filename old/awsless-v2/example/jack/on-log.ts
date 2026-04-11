import { gunzipSync } from 'zlib'

export default async (event: any) => {
	// const id = randomUUID()

	const zipped = Buffer.from(event.awslogs.data, 'base64')
	const unzipped = gunzipSync(zipped)
	const log = JSON.parse(unzipped.toString())

	console.log(log)

	// await putItem(logs, {
	// 	id,
	// 	error,
	// })
}
