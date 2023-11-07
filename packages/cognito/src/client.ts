import { ResponseError } from './error/response-error.js'
import { Store } from './store/store.js'

export class Client {
	readonly userPoolId: string
	readonly region: string

	constructor(
		private props: {
			userPoolId: string
			id: string
			secret?: string
			region?: string
			store: Store
			deviceStore?: Store
		}
	) {
		if (props.userPoolId.includes('_')) {
			const [r, p] = props.userPoolId.split('_')
			this.userPoolId = p
			this.region = r
		} else if (props.region) {
			this.userPoolId = props.userPoolId
			this.region = props.region
		} else {
			throw new TypeError('Region is required')
		}
	}

	get id() {
		return this.props.id
	}

	get secret() {
		return this.props.secret
	}

	get store() {
		return this.props.store
	}

	get deviceStore() {
		return this.props.deviceStore
	}

	async call(action: string, params?: object) {
		const response = await fetch(`https://cognito-idp.${this.region}.amazonaws.com`, {
			body: JSON.stringify(params),
			method: 'POST',
			cache: 'no-cache',
			referrerPolicy: 'no-referrer',
			headers: {
				'Cache-Control': 'max-age=0',
				'Content-Type': 'application/x-amz-json-1.1',
				'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
			},
		})

		const result = await response.text()
		const data = result ? JSON.parse(result) : {}

		if (!response.ok) {
			const code = data._type || data.__type
			const message = data.message || code || 'Unknown Cognito Error'

			throw new ResponseError(message, code)
		}

		return data
	}
}
