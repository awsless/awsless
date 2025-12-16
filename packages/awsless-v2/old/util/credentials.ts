import { fromIni } from '@aws-sdk/credential-providers'
import { AwsCredentialIdentityProvider } from '@aws-sdk/types'

export type Credentials = AwsCredentialIdentityProvider

export const getCredentials = (profile: string): Credentials => {
	return fromIni({
		profile,
	})
}
