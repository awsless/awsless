import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { SignatureV4a } from '@aws-sdk/signature-v4a'
import { Credentials } from './aws.js'

// The kvs api only accepts SigV4a signatures. The sdk finds a SigV4a
// signer through a registration container, which silently breaks when
// the lockfile holds two copies of the signing packages - the signer
// registers into one copy while the client reads the other. Handing
// the client our own signer class skips the container entirely.
export const createKvsClient = (props: { credentials: Credentials; region: string }) => {
	return new CloudFrontKeyValueStoreClient({
		...props,
		signerConstructor: SignatureV4a,
	})
}
