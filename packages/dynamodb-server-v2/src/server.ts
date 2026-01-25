import {
	createServer as createHttpServer,
	type IncomingMessage,
	type Server as NodeServer,
	type ServerResponse,
} from 'node:http'
import { DynamoDBError, SerializationException } from './errors/index.js'
import {
	batchGetItem,
	batchWriteItem,
	createTable,
	deleteItem,
	deleteTable,
	describeTable,
	getItem,
	listTables,
	putItem,
	query,
	scan,
	transactGetItems,
	transactWriteItems,
	updateItem,
} from './operations/index.js'
import type { TableStore } from './store/index.js'

type OperationHandler = (store: TableStore, input: unknown) => unknown

const operations: Record<string, OperationHandler> = {
	CreateTable: createTable as OperationHandler,
	DeleteTable: deleteTable as OperationHandler,
	DescribeTable: describeTable as OperationHandler,
	ListTables: listTables as OperationHandler,
	PutItem: putItem as OperationHandler,
	GetItem: getItem as OperationHandler,
	DeleteItem: deleteItem as OperationHandler,
	UpdateItem: updateItem as OperationHandler,
	Query: query as OperationHandler,
	Scan: scan as OperationHandler,
	BatchGetItem: batchGetItem as OperationHandler,
	BatchWriteItem: batchWriteItem as OperationHandler,
	TransactGetItems: transactGetItems as OperationHandler,
	TransactWriteItems: transactWriteItems as OperationHandler,
}

function parseTarget(target: string | null | undefined): string | null {
	if (!target) return null
	const match = target.match(/^DynamoDB_\d+\.(\w+)$/)
	return match ? (match[1] ?? null) : null
}

function generateUUID(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

function formatError(error: unknown): { body: string; status: number } {
	if (error instanceof DynamoDBError) {
		return {
			body: JSON.stringify(error.toJSON()),
			status: error.statusCode,
		}
	}

	return {
		body: JSON.stringify({
			__type: 'com.amazonaws.dynamodb.v20120810#InternalServerError',
			message: error instanceof Error ? error.message : 'Internal server error',
		}),
		status: 500,
	}
}

async function handleRequest(
	store: TableStore,
	method: string,
	target: string | null | undefined,
	getBody: () => Promise<string>
): Promise<{ body: string; status: number; requestId: string }> {
	const requestId = generateUUID()

	if (method !== 'POST') {
		return {
			body: JSON.stringify({ message: 'Method not allowed' }),
			status: 405,
			requestId,
		}
	}

	const operation = parseTarget(target)

	if (!operation) {
		return {
			body: JSON.stringify({
				__type: 'com.amazon.coral.service#UnknownOperationException',
				message: 'Unknown operation',
			}),
			status: 400,
			requestId,
		}
	}

	const handler = operations[operation]
	if (!handler) {
		return {
			body: JSON.stringify({
				__type: 'com.amazon.coral.service#UnknownOperationException',
				message: `Unknown operation: ${operation}`,
			}),
			status: 400,
			requestId,
		}
	}

	let body: unknown
	try {
		const text = await getBody()
		body = text ? JSON.parse(text) : {}
	} catch {
		const err = formatError(new SerializationException('Could not parse request body'))
		return { ...err, requestId }
	}

	try {
		const result = handler(store, body)
		return {
			body: JSON.stringify(result),
			status: 200,
			requestId,
		}
	} catch (error) {
		const err = formatError(error)
		return { ...err, requestId }
	}
}

export interface ServerInstance {
	port: number
	stop: () => void
}

const isBun = typeof globalThis.Bun !== 'undefined'

function createBunServer(store: TableStore, port: number): ServerInstance {
	const server = Bun.serve({
		port,
		async fetch(req) {
			const result = await handleRequest(store, req.method, req.headers.get('X-Amz-Target'), () => req.text())

			return new Response(result.body, {
				status: result.status,
				headers: {
					'Content-Type': 'application/x-amz-json-1.0',
					'x-amzn-RequestId': result.requestId,
				},
			})
		},
	})

	return {
		port: server.port ?? port,
		stop: () => server.stop(),
	}
}

function createNodeServer(store: TableStore, port: number): Promise<ServerInstance> {
	return new Promise((resolve, reject) => {
		const server: NodeServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
			const getBody = (): Promise<string> => {
				return new Promise((resolve, reject) => {
					let body = ''
					req.on('data', chunk => {
						body += chunk.toString()
					})
					req.on('end', () => resolve(body))
					req.on('error', reject)
				})
			}

			const result = await handleRequest(
				store,
				req.method ?? 'GET',
				req.headers['x-amz-target'] as string | undefined,
				getBody
			)

			res.writeHead(result.status, {
				'Content-Type': 'application/x-amz-json-1.0',
				'x-amzn-RequestId': result.requestId,
			})
			res.end(result.body)
		})

		server.on('error', reject)

		server.listen(port, () => {
			const address = server.address()
			const actualPort = typeof address === 'object' && address ? address.port : port

			resolve({
				port: actualPort,
				stop: () => server.close(),
			})
		})
	})
}

export function createServer(store: TableStore, port: number): ServerInstance | Promise<ServerInstance> {
	if (isBun) {
		return createBunServer(store, port)
	}
	return createNodeServer(store, port)
}
