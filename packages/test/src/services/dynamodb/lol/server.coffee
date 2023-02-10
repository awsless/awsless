
import AWS				from 'aws-sdk'
import dynamoDbLocal	from 'dynamo-db-local'

export default class Server

	constructor: (@region = 'eu-west-1') ->
		@dynamos	= []
		@clients	= []
		@port		= 80

	listen: (@port) ->
		for dynamo in @dynamos
			dynamo.endpoint.port = @port

		for client in @clients
			client.service.endpoint.port = @port

		@process = await dynamoDbLocal.spawn {
			port: @port
		}

	destroy: ->
		if @process
			await @process.kill()

	dynamodb: ->
		instance = new AWS.DynamoDB {
			apiVersion: 		'2016-11-23'
			endpoint: 			"http://localhost:#{ @port or 80 }"
			region: 			@region
			sslEnabled:			false
			accessKeyId:		'fake'
			secretAccessKey:	'fake'
		}

		@dynamos.push instance

		return instance

	documentClient: ->
		client = new AWS.DynamoDB.DocumentClient {
			service: @dynamodb()
		}

		@clients.push client

		return client
