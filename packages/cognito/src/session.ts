import { Token } from './token'

export class Session {
	readonly clockDrift: number

	constructor(
		private props: {
			idToken: Token
			accessToken: Token
			clockDrift?: number
		}
	) {
		this.clockDrift = typeof props.clockDrift !== 'undefined' ? props.clockDrift : this.calculateClockDrift()
	}

	get accessToken() {
		return this.props.accessToken
	}

	get idToken() {
		return this.props.idToken
	}

	get user() {
		const idToken = this.props.idToken.payload
		const accessToken = this.props.accessToken.payload

		return {
			id: idToken.sub as string,
			name: accessToken.username as string,
			email: idToken.email as string | undefined,
			deviceKey: accessToken.device_key as string,
		}
	}

	private calculateClockDrift() {
		const now = Math.floor(Date.now() / 1000)
		const iat = Math.min(this.props.accessToken.issuedAt, this.props.idToken.issuedAt)

		return now - iat
	}

	isValid() {
		const expireWindow = 60
		const now = Math.floor(Date.now() / 1000)
		const adjusted = now - this.clockDrift + expireWindow

		return adjusted < this.props.accessToken.expiration && adjusted < this.props.idToken.expiration
	}
}
