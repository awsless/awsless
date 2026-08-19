import { createServer } from 'node:http'
import { seconds } from '@awsless/duration'
import { subscribe } from '@awsless/sqs'
import { getInstanceQueueName } from 'awsless'

// An instance is a long running program on fargate: a health server
// plus whatever loop the app needs. Locally the dev server runs this
// same file as a bun child - the health port comes in through PORT
// (production has no PORT set & binds 80).
const port = Number(process.env.PORT ?? 80)

createServer((_, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' })
	res.end('OK')
}).listen(port, () => {
	console.log(`Health server running on port ${port}`)
})

// Work arrives through the instance's own queue: anything the app
// sends with Instance.todo.worker(payload) lands here.
for await (const records of subscribe({
	queue: getInstanceQueueName('worker'),
	waitTime: seconds(5),
	visibilityTimeout: seconds(30),
})) {
	for (const record of records) {
		console.log('Working on:', JSON.stringify(record.payload))
	}
}
