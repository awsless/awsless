
export const tables = [
	{
		TableName: 'users',
		KeySchema: [
			{ KeyType: 'HASH', AttributeName: 'id' }
		],
		AttributeDefinitions: [
			{ AttributeName: 'id', AttributeType: 'N' }
		]
	},
	{
		TableName: 'posts',
		KeySchema: [
			{ KeyType: 'HASH', AttributeName: 'userId' },
			{ KeyType: 'SORT', AttributeName: 'id' }
		],
		AttributeDefinitions: [
			{ AttributeName: 'sortId', AttributeType: 'N' },
			{ AttributeName: 'userId', AttributeType: 'N' },
			{ AttributeName: 'id', AttributeType: 'N' }
		],
		GlobalSecondaryIndexes: [
			{
				IndexName: 'list',
				Projection: {
					ProjectionType: 'ALL'
				},
				KeySchema: [
					{ KeyType: 'HASH', AttributeName: 'userId' },
					{ KeyType: 'SORT', AttributeName: 'sortId' }
				],
			}
		]
	}
]
