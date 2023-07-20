import { S3Client } from '@aws-sdk/client-s3'
import { globalClient } from '@awsless/utils'

export const s3Client = globalClient(() => {
	return new S3Client({})
})
