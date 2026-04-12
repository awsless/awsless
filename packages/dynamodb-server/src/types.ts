export type AttributeValue =
	| { S: string }
	| { N: string }
	| { B: string }
	| { SS: string[] }
	| { NS: string[] }
	| { BS: string[] }
	| { M: AttributeMap }
	| { L: AttributeValue[] }
	| { NULL: true }
	| { BOOL: boolean }

export type AttributeMap = Record<string, AttributeValue>

export interface KeySchemaElement {
	AttributeName: string
	KeyType: 'HASH' | 'RANGE'
}

export interface AttributeDefinition {
	AttributeName: string
	AttributeType: 'S' | 'N' | 'B'
}

export interface Projection {
	ProjectionType?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE'
	NonKeyAttributes?: string[]
}

export interface ProvisionedThroughput {
	ReadCapacityUnits: number
	WriteCapacityUnits: number
}

export interface GlobalSecondaryIndex {
	IndexName: string
	KeySchema: KeySchemaElement[]
	Projection: Projection
	ProvisionedThroughput?: ProvisionedThroughput
}

export interface LocalSecondaryIndex {
	IndexName: string
	KeySchema: KeySchemaElement[]
	Projection: Projection
}

export type StreamViewType = 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES'

export interface StreamSpecification {
	StreamEnabled: boolean
	StreamViewType?: StreamViewType
}

export interface TimeToLiveSpecification {
	AttributeName: string
	Enabled: boolean
}

export interface TableDescription {
	TableName: string
	TableStatus: 'CREATING' | 'ACTIVE' | 'DELETING' | 'UPDATING'
	CreationDateTime: number
	TableArn: string
	TableId: string
	KeySchema: KeySchemaElement[]
	AttributeDefinitions: AttributeDefinition[]
	ProvisionedThroughput?: {
		ReadCapacityUnits: number
		WriteCapacityUnits: number
		LastIncreaseDateTime?: number
		LastDecreaseDateTime?: number
		NumberOfDecreasesToday?: number
	}
	BillingModeSummary?: {
		BillingMode: 'PROVISIONED' | 'PAY_PER_REQUEST'
		LastUpdateToPayPerRequestDateTime?: number
	}
	GlobalSecondaryIndexes?: GlobalSecondaryIndexDescription[]
	LocalSecondaryIndexes?: LocalSecondaryIndexDescription[]
	StreamSpecification?: StreamSpecification
	LatestStreamArn?: string
	LatestStreamLabel?: string
	ItemCount: number
	TableSizeBytes: number
}

export interface GlobalSecondaryIndexDescription {
	IndexName: string
	KeySchema: KeySchemaElement[]
	Projection: Projection
	IndexStatus: 'CREATING' | 'ACTIVE' | 'DELETING' | 'UPDATING'
	ProvisionedThroughput?: ProvisionedThroughput
	IndexSizeBytes: number
	ItemCount: number
	IndexArn: string
}

export interface LocalSecondaryIndexDescription {
	IndexName: string
	KeySchema: KeySchemaElement[]
	Projection: Projection
	IndexSizeBytes: number
	ItemCount: number
	IndexArn: string
}

export interface StreamRecord {
	eventID: string
	eventName: 'INSERT' | 'MODIFY' | 'REMOVE'
	eventVersion: string
	eventSource: string
	awsRegion: string
	dynamodb: {
		ApproximateCreationDateTime: number
		Keys: AttributeMap
		NewImage?: AttributeMap
		OldImage?: AttributeMap
		SequenceNumber: string
		SizeBytes: number
		StreamViewType: StreamViewType
	}
}

export type StreamCallback = (record: StreamRecord) => void

export interface ConsumedCapacity {
	TableName: string
	CapacityUnits: number
	ReadCapacityUnits?: number
	WriteCapacityUnits?: number
	Table?: {
		CapacityUnits: number
		ReadCapacityUnits?: number
		WriteCapacityUnits?: number
	}
	GlobalSecondaryIndexes?: Record<
		string,
		{
			CapacityUnits: number
			ReadCapacityUnits?: number
			WriteCapacityUnits?: number
		}
	>
	LocalSecondaryIndexes?: Record<
		string,
		{
			CapacityUnits: number
			ReadCapacityUnits?: number
			WriteCapacityUnits?: number
		}
	>
}
