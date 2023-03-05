
import { BatchGetItemCommand, BatchWriteItemCommand, CreateTableCommand, CreateTableCommandInput, DeleteItemCommand, DynamoDBClient, GetItemCommand, ListTablesCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, TransactGetCommand, TransactWriteCommand, UpdateCommand, QueryCommand as Query, ScanCommand as Scan, BatchGetCommand} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBServer } from '@awsless/dynamodb-server'
import { requestPort } from '@heat/request-port'
import { SeedData, seed } from './seed'
import { migrate } from './migrate'
import { AnyTableDefinition } from '../table'

export interface StartDynamoDBOptions {
	tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTableDefinition | AnyTableDefinition[],
	timeout?: number
	seed?: SeedData
}

export const mockDynamoDB = (configOrServer:StartDynamoDBOptions | DynamoDBServer) => {

	let server:DynamoDBServer;

	if(configOrServer instanceof DynamoDBServer) {
		server = configOrServer
	} else {
		server = new DynamoDBServer()
		let releasePort: () => Promise<void>

		beforeAll && beforeAll(async () => {
			const [ port, release ] = await requestPort()
			releasePort = release

			await server.listen(port)
			await server.wait()

			if(configOrServer.tables) {
				await migrate(server.getClient(), configOrServer.tables)
				if(configOrServer.seed) {
					await seed(server.getDocumentClient(), configOrServer.seed)
				}
			}
		}, configOrServer.timeout)

		afterAll && afterAll(async () => {
			await server.kill()
			await releasePort()
		}, configOrServer.timeout)
	}

	const client = server.getClient()
	const documentClient = server.getDocumentClient()

	const clientSend = (command:any) => {
		// @ts-ignore
		if(client.__proto__.send.wrappedMethod) {
			// @ts-ignore
			return client.__proto__.send.wrappedMethod.call(client, command)
		}

		return client.send(command)
	}

	const documentClientSend = (command:any) => {
		// @ts-ignore
		if(documentClient.__proto__.send.wrappedMethod) {
			// @ts-ignore
			return documentClient.__proto__.send.wrappedMethod.call(documentClient, command)
		}

		return documentClient.send(command)
	}

	// @ts-ignore
	mockClient(DynamoDBClient)
		// @ts-ignore
		.on(CreateTableCommand).callsFake((input) => clientSend(new CreateTableCommand(input)))
		// @ts-ignore
		.on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input)))

		// @ts-ignore
		.on(GetItemCommand).callsFake((input) => clientSend(new GetItemCommand(input)))
		// @ts-ignore
		.on(PutItemCommand).callsFake((input) => clientSend(new PutItemCommand(input)))
		// @ts-ignore
		.on(DeleteItemCommand).callsFake((input) => clientSend(new DeleteItemCommand(input)))
		// @ts-ignore
		.on(UpdateItemCommand).callsFake((input) => clientSend(new UpdateItemCommand(input)))
		// @ts-ignore
		.on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input)))
		// @ts-ignore
		.on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input)))
		// @ts-ignore
		.on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input)))
		// @ts-ignore
		.on(BatchWriteItemCommand).callsFake((input) => clientSend(new BatchWriteItemCommand(input)))
		// @ts-ignore
		.on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input)))
		// @ts-ignore
		.on(TransactWriteItemsCommand).callsFake((input) => clientSend(new TransactWriteItemsCommand(input)))

	// @ts-ignore
	mockClient(DynamoDBDocumentClient)
		.on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input)))
		.on(PutCommand).callsFake((input) => documentClientSend(new PutCommand(input)))
		.on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input)))
		.on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input)))
		.on(Query).callsFake((input) => documentClientSend(new Query(input)))
		.on(Scan).callsFake((input) => documentClientSend(new Scan(input)))
		.on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input)))
		.on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input)))
		.on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input)))
		.on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)))

	return server
}
