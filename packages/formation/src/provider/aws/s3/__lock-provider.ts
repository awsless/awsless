import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { URN } from '../../../core/resource'
import { LockProvider as Provider } from '../../../core/lock'

import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	PutObjectLegalHoldCommand,
	S3Client,
} from '@aws-sdk/client-s3'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
	bucket: string
}

export class LockProvider implements Provider {
	protected client: S3Client

	constructor(private props: ProviderProps) {
		this.client = new S3Client(props)
	}

	private async prepareLockFile(urn: URN) {
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.props.bucket,
				Key: `${urn}.lock`,
				Body: '',
			})
		)
	}

	private async deleteLockFile(urn: URN) {
		await this.client.send(
			new DeleteObjectCommand({
				Bucket: this.props.bucket,
				Key: `${urn}.lock`,
			})
		)
	}

	private async holdLock(urn: URN) {
		await this.client.send(
			new PutObjectLegalHoldCommand({
				Bucket: this.props.bucket,
				Key: `${urn}.lock`,
				LegalHold: {
					Status: 'ON',
				},
			})
		)
	}

	private async releaseLock(urn: URN) {
		await this.client.send(
			new PutObjectLegalHoldCommand({
				Bucket: this.props.bucket,
				Key: `${urn}.lock`,
				LegalHold: {
					Status: 'OFF',
				},
			})
		)
	}

	async locked(urn: URN) {
		const result = await this.client.send(
			new GetObjectCommand({
				Bucket: this.props.bucket,
				Key: `${urn}.lock`,
			})
		)

		if (!result.Body) {
			return false
		}

		const body = await result.Body.transformToString('utf8')
		const lock = JSON.parse(body)

		return typeof lock === 'number'
	}

	async lock(urn: URN) {
		await this.prepareLockFile(urn)
		await this.holdLock(urn)

		return async () => {
			await this.releaseLock(urn)
			await this.deleteLockFile(urn)
		}
	}
}
