

# TODO:
- onFailure for lambda, sqs, dynamodb streams
- add cache plugin & think about VPC lambda solutions
- add fargate container stuff for long lived services
- add check for existing graphql resolver field in schema
- add check for conflicting types inside graphql (Like duplicate type names)
  - Types should probably only allowed to defined once. And should be extended after that.

---
---
---

# Features

- Domains
- Sites
- Functions
- Database
  - Tables
  - Stores
  - Caches
  - Searchs
- Queues
- Topics
- Pubsub
- Crons
- API
  - HTTP
  - GraphQL


## Domains

We use AWS Route53 to provide domain management.

```js
{
	domains: {
		'example.com': [{
			name: 'sub',
			type: 'A',
			records: [ ... ],
		}],
	}
}
```

## Functions

We use AWS Lambda to provide serverless functions.

```js
{
	defaults: {
		function: {
			// Setting default values for all functions...
		}
	},
	stacks: [{
		functions: {
			FUNCTION_NAME: 'function.ts'
		}
	}]
}
```

## Tables

We use AWS DynamoDB to provide serverless tables.

```js
{
	stacks: [{
		tables: {
			TABLE_NAME: {
				hash: 'id',
				fields: {
					id: 'string',
				}
			}
		}
	}]
}
```

## Stores

We use AWS S3 to provide serverless key-value storage.

```js
{
	stacks: [{
		stores: [ 'STORE_NAME' ]
	}]
}
```

## Caches

We use AWS MemoryDB to provide __redis compatible__ in-memory storage.

_WORK IN PROGRESS..._

## Searchs

We use AWS Open Search Serverless to provide serverless search api.

```js
{
	stacks: [{
		searchs: [ 'SEARCH_NAME' ]
	}]
}
```

## Queues

We use AWS SQS to provide serverless queues.

```js
{
	stacks: [{
		queues: {
			QUEUE_NAME: 'queue-consumer.ts',
		}
	}]
}
```

## Topics

We use AWS SNS to provide serverless pubsub topics.

```js
{
	stacks: [{
		topics: [ 'TOPIC_NAME' ],
		subscribers: {
			TOPIC_NAME: 'topic-consumer.ts',
		}
	}]
}
```

## Pubsub

We use AWS IoT to provide a serverless mqtt pubsub channel.

```js
{
	stacks: [{
		pubsub: {
			PUBSUB_NAME: {
				sql: `SELECT * FROM '$aws/events/presence/connected/+'`,
				consumer: 'pubsub-consumer.ts',
			}
		}
	}]
}
```

## Crons

We use AWS Event Bridge to provide serverless cron jobs.

```js
{
	stacks: [{
		crons: {
			CRON_NAME: {
				schedule: 'rate(1 day)',
				consumer: 'cron-consumer.ts',
			}
		}
	}]
}
```

## HTTP

We use AWS ELB to provide a HTTP API.

```js
{
	stacks: [{
		http: {
			HTTP_API_NAME: {
				'GET /posts': 'list-posts.ts',
				'POST /posts': 'create-post.ts',
			}
		}
	}]
}
```

## REST

We use AWS ApiGatewayV2 to provide a serverless REST API.

```js
{
	stacks: [{
		rest: {
			REST_API_NAME: {
				'GET /posts/{id}': 'get-posts.ts',
				'DELETE /posts/{id}': 'delete-post.ts',
			}
		}
	}]
}
```

## GraphQL

We use AWS AppSync to provide a serverless GraphQL API.

```js
{
	stacks: [{
		graphql: {
			GRAPHQL_API_NAME: {
				schema: 'schema.gql',
				resolvers: {
					'Query posts': 'list-posts.ts',
					'Mutation createPost': 'create-post.ts',
				}
			}
		}
	}]
}
```
