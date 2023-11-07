import decode from 'jwt-decode'

export class Token {
	static fromString(token: string) {
		return new Token(token, decode(token))
	}

	constructor(private string: string, readonly payload: Record<string, string | number | undefined>) {}

	get expiration() {
		return this.payload.exp as number
	}

	get issuedAt() {
		return this.payload.iat as number
	}

	toString() {
		return this.string
	}
}
