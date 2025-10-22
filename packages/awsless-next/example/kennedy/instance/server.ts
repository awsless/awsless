// import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { createServer } from 'node:http'
import { getQueueUrl } from '../../../src/server'

console.log('Starting instance....')

const PORT = process.env.PORT ?? 80

// Start HTTP server
const server = createServer((_, res) => {
	console.log('Health check request')
	res.writeHead(200, { 'Content-Type': 'text/plain' })
})

server.listen(PORT, () => {
	console.log(`HTTP server running on port ${PORT}`)
})

// // Initialize SQS client
// const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
// const queueUrl = process.env.QUEUE_STACK_TEST_URL

// console.log(`Polling queue: ${queueUrl}`)

// // Function to process a single message
// async function processMessage(message: any) {
// 	console.log('Processing message:', message.MessageId)
// 	console.log('Message body:', message.Body)

// 	try {
// 		const body = JSON.parse(message.Body)

// 		// TODO: Add your SQL processing logic here
// 		// For example:
// 		// - Parse SQL query from message
// 		// - Execute against database
// 		// - Handle results

// 		console.log('Parsed message data:', body)

// 		// Simulate processing
// 		await new Promise(resolve => setTimeout(resolve, 1000))

// 		console.log('Successfully processed message:', message.MessageId)
// 	} catch (error) {
// 		console.error('Error processing message:', error)
// 		throw error // Re-throw to prevent deletion
// 	}
// }

// // Function to poll and process messages
// async function pollQueue() {
// 	try {
// 		const receiveCommand = new ReceiveMessageCommand({
// 			QueueUrl: queueUrl,
// 			MaxNumberOfMessages: 10,
// 			WaitTimeSeconds: 20, // Long polling
// 			VisibilityTimeout: 30,
// 		})

// 		const response = await sqsClient.send(receiveCommand)

// 		if (response.Messages && response.Messages.length > 0) {
// 			console.log(`Received ${response.Messages.length} message(s)`)

// 			// Process messages concurrently
// 			await Promise.all(
// 				response.Messages.map(async message => {
// 					try {
// 						await processMessage(message)

// 						// Delete message after successful processing
// 						const deleteCommand = new DeleteMessageCommand({
// 							QueueUrl: queueUrl,
// 							ReceiptHandle: message.ReceiptHandle,
// 						})

// 						await sqsClient.send(deleteCommand)
// 						console.log('Deleted message:', message.MessageId)
// 					} catch (error) {
// 						console.error('Failed to process message:', message.MessageId, error)
// 					}
// 				})
// 			)
// 		}
// 	} catch (error) {
// 		console.error('Error polling queue:', error)
// 	}

// 	// Continue polling
// 	setImmediate(() => pollQueue())
// }

// // Start polling
// pollQueue()
