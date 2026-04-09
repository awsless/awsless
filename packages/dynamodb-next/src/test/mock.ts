import {
	BatchGetItemCommand,
	type BatchGetItemCommandOutput,
	BatchWriteItemCommand,
	type BatchWriteItemCommandOutput,
	CreateTableCommand,
	type CreateTableCommandInput,
	type CreateTableCommandOutput,
	DeleteItemCommand,
	type DeleteItemCommandOutput,
	DynamoDBClient,
	GetItemCommand,
	type GetItemCommandOutput,
	ListTablesCommand,
	type ListTablesCommandOutput,
	PutItemCommand,
	type PutItemCommandOutput,
	QueryCommand,
	type QueryCommandOutput,
	ScanCommand,
	type ScanCommandOutput,
	TransactGetItemsCommand,
	type TransactGetItemsCommandOutput,
	TransactWriteItemsCommand,
	type TransactWriteItemsCommandOutput,
	UpdateItemCommand,
	type UpdateItemCommandOutput,
} from '@aws-sdk/client-dynamodb'
import {
	BatchGetCommand,
	type BatchGetCommandOutput,
	BatchWriteCommand,
	type BatchWriteCommandOutput,
	DeleteCommand,
	type DeleteCommandOutput,
	type QueryCommandOutput as DocQueryCommandOutput,
	type ScanCommandOutput as DocScanCommandOutput,
	DynamoDBDocumentClient,
	GetCommand,
	type GetCommandOutput,
	PutCommand,
	type PutCommandOutput,
	QueryCommand as Query,
	ScanCommand as Scan,
	TransactGetCommand,
	type TransactGetCommandOutput,
	TransactWriteCommand,
	type TransactWriteCommandOutput,
	UpdateCommand,
	type UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb'
import { DynamoDBServer } from '@awsless/dynamodb-server'
import { requestPort } from '@heat/request-port'
import { mockClient } from 'aws-sdk-vitest-mock'
import { AnyTable, Infer } from '../table'
import { migrate } from './migrate'
import { seed } from './seed'
import { pipeStream, Stream } from './stream'

type SeedTable<T extends AnyTable> = { table: T; items: Infer<T>[] }
type Tables = CreateTableCommandInput | CreateTableCommandInput[] | AnyTable | AnyTable[]

export type StartDynamoDBOptions<T extends Tables> = {
	tables: T
	stream?: Stream<AnyTable>[]
	timeout?: number
	seed?: SeedTable<AnyTable>[]
	engine?: 'speed' | 'correctness'
}

export const mockDynamoDB = /* @__PURE__ */ <T extends Tables>(configOrServer: StartDynamoDBOptions<T>) => {
	let server: DynamoDBServer

	if (configOrServer instanceof DynamoDBServer) {
		server = configOrServer
	} else {
		server = new DynamoDBServer({
			engine: configOrServer.engine === 'correctness' ? 'java' : 'memory',
			// engine: 'java',
		})

		if (typeof beforeAll !== 'undefined') {
			beforeAll(async () => {
				const [port, releasePort] = await requestPort()

				await server.listen(port)

				const dbMock = mockClient(DynamoDBClient)
				dbMock
					.on(CreateTableCommand)
					.callsFake(input => clientSend(new CreateTableCommand(input)) as Promise<CreateTableCommandOutput>)
				dbMock
					.on(ListTablesCommand)
					.callsFake(
						input => clientSend(new ListTablesCommand(input ?? {})) as Promise<ListTablesCommandOutput>
					)
				dbMock
					.on(GetItemCommand)
					.callsFake(input => clientSend(new GetItemCommand(input)) as Promise<GetItemCommandOutput>)
				dbMock
					.on(PutItemCommand)
					.callsFake(input => clientSend(new PutItemCommand(input)) as Promise<PutItemCommandOutput>)
				dbMock
					.on(DeleteItemCommand)
					.callsFake(input => clientSend(new DeleteItemCommand(input)) as Promise<DeleteItemCommandOutput>)
				dbMock
					.on(UpdateItemCommand)
					.callsFake(input => clientSend(new UpdateItemCommand(input)) as Promise<UpdateItemCommandOutput>)
				dbMock
					.on(QueryCommand)
					.callsFake(input => clientSend(new QueryCommand(input)) as Promise<QueryCommandOutput>)
				dbMock
					.on(ScanCommand)
					.callsFake(input => clientSend(new ScanCommand(input)) as Promise<ScanCommandOutput>)
				dbMock
					.on(BatchGetItemCommand)
					.callsFake(
						input => clientSend(new BatchGetItemCommand(input)) as Promise<BatchGetItemCommandOutput>
					)
				dbMock
					.on(BatchWriteItemCommand)
					.callsFake(
						input => clientSend(new BatchWriteItemCommand(input)) as Promise<BatchWriteItemCommandOutput>
					)
				dbMock
					.on(TransactGetItemsCommand)
					.callsFake(
						input =>
							clientSend(new TransactGetItemsCommand(input)) as Promise<TransactGetItemsCommandOutput>
					)
				dbMock
					.on(TransactWriteItemsCommand)
					.callsFake(
						input =>
							clientSend(new TransactWriteItemsCommand(input)) as Promise<TransactWriteItemsCommandOutput>
					)

				// ---------------------------------------------------------------------------------

				const docMock = mockClient(DynamoDBDocumentClient)
				docMock
					.on(GetCommand)
					.callsFake(input => documentClientSend(new GetCommand(input)) as Promise<GetCommandOutput>)
				docMock
					.on(PutCommand)
					.callsFake(input => documentClientSend(new PutCommand(input)) as Promise<PutCommandOutput>)
				docMock
					.on(DeleteCommand)
					.callsFake(input => documentClientSend(new DeleteCommand(input)) as Promise<DeleteCommandOutput>)
				docMock
					.on(UpdateCommand)
					.callsFake(input => documentClientSend(new UpdateCommand(input)) as Promise<UpdateCommandOutput>)
				docMock
					.on(Query)
					.callsFake(input => documentClientSend(new Query(input)) as Promise<DocQueryCommandOutput>)
				docMock
					.on(Scan)
					.callsFake(input => documentClientSend(new Scan(input)) as Promise<DocScanCommandOutput>)
				docMock
					.on(BatchGetCommand)
					.callsFake(
						input => documentClientSend(new BatchGetCommand(input)) as Promise<BatchGetCommandOutput>
					)
				docMock
					.on(BatchWriteCommand)
					.callsFake(
						input => documentClientSend(new BatchWriteCommand(input)) as Promise<BatchWriteCommandOutput>
					)
				docMock
					.on(TransactGetCommand)
					.callsFake(
						input => documentClientSend(new TransactGetCommand(input)) as Promise<TransactGetCommandOutput>
					)
				docMock
					.on(TransactWriteCommand)
					.callsFake(
						input =>
							documentClientSend(new TransactWriteCommand(input)) as Promise<TransactWriteCommandOutput>
					)

				if (configOrServer.tables) {
					await migrate(server.getClient(), configOrServer.tables)
					if (configOrServer.seed) {
						await seed(configOrServer.seed)
					}
				}

				return async () => {
					await server.stop()
					await releasePort()
				}
			}, configOrServer.timeout)
		}
	}

	// Save original send methods before mockClient replaces them on the prototype
	const originalDynamoDBSend = DynamoDBClient.prototype.send
	const originalDocumentClientSend = DynamoDBDocumentClient.prototype.send

	const client = server.getClient()
	const documentClient = server.getDocumentClient()

	const processStream = (command: any, send: <T>() => T) => {
		if (!(configOrServer instanceof DynamoDBServer) && configOrServer.stream) {
			return pipeStream(configOrServer.stream, command, send)
		}

		return send()
	}

	const clientSend = (command: any) => {
		return processStream(command, () => {
			return (originalDynamoDBSend as Function).call(client, command)
		})
	}

	const documentClientSend = (command: any) => {
		return processStream(command, () => {
			return (originalDocumentClientSend as Function).call(documentClient, command)
		})
	}

	// const clientSend = (command: any) => {
	// 	return processStream(command, () => {
	// 		// @ts-ignore
	// 		if (client.__proto__.send.wrappedMethod) {
	// 			// @ts-ignore
	// 			return client.__proto__.send.wrappedMethod.call(client, command)
	// 		}

	// 		return client.send(command)
	// 	})
	// }

	// const documentClientSend = (command: any) => {
	// 	return processStream(command, () => {
	// 		// @ts-ignore
	// 		if (documentClient.__proto__.send.wrappedMethod) {
	// 			// @ts-ignore
	// 			return documentClient.__proto__.send.wrappedMethod.call(documentClient, command)
	// 		}

	// 		return documentClient.send(command)
	// 	})
	// }

	return server
}
