
import { BatchGetItemCommand, BatchWriteItemCommand, CreateTableCommand, CreateTableCommandInput, DeleteItemCommand, DynamoDBClient, GetItemCommand, ListTablesCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, TransactGetCommand, TransactWriteCommand, UpdateCommand, QueryCommand as Query, ScanCommand as Scan, BatchGetCommand} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBServer } from '@awsless/dynamodb-server'
import { requestPort } from '@heat/request-port'
import { seed } from './seed'
import { migrate } from './migrate'
import { AnyTableDefinition, InferInput } from '../table'

// type GetType<T extends CreateTableCommandInput[]> = T extends (infer U)[] ? U : never;

// type SeedTable<T extends AnyTableDefinition> = {
// 	table: T extends (first: infer K) =>  any ? K : any ;
// 	items: InferInput<E>[]
// }

// type SeedTable<T extends AnyTableDefinition> = Record<T['name'], InferInput<T>[]>
// type Names<T extends AnyTableDefinition[]> = { [ K in keyof T ]: T[K]['name'] }[number]

// type Single<T extends AnyTableDefinition[]> =

type SeedTable<T extends AnyTableDefinition> = { table: T, items:InferInput<T>[] }

export type StartDynamoDBOptions = {
	tables: CreateTableCommandInput | CreateTableCommandInput[] | AnyTableDefinition | AnyTableDefinition[],
	timeout?: number
	seed?: SeedTable<AnyTableDefinition>[]
}

export const mockDynamoDB = (configOrServer:StartDynamoDBOptions | DynamoDBServer) => {

	let server:DynamoDBServer;

	if(configOrServer instanceof DynamoDBServer) {
		server = configOrServer
	} else {
		server = new DynamoDBServer()

		beforeAll && beforeAll(async () => {
			const [ port, releasePort ] = await requestPort()

			await server.listen(port)
			await server.wait()

			if(configOrServer.tables) {
				await migrate(server.getClient(), configOrServer.tables)
				if(configOrServer.seed) {
					await seed(configOrServer.seed)
				}
			}

			return async () => {
				await server.kill()
				await releasePort()
			}
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

	mockClient(DynamoDBClient)
		.on(CreateTableCommand).callsFake((input) => clientSend(new CreateTableCommand(input)))
		.on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input)))
		.on(GetItemCommand).callsFake((input) => clientSend(new GetItemCommand(input)))
		.on(PutItemCommand).callsFake((input) => clientSend(new PutItemCommand(input)))
		.on(DeleteItemCommand).callsFake((input) => clientSend(new DeleteItemCommand(input)))
		.on(UpdateItemCommand).callsFake((input) => clientSend(new UpdateItemCommand(input)))
		.on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input)))
		.on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input)))
		.on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input)))
		.on(BatchWriteItemCommand).callsFake((input) => clientSend(new BatchWriteItemCommand(input)))
		.on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input)))
		.on(TransactWriteItemsCommand).callsFake((input) => clientSend(new TransactWriteItemsCommand(input)))

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
