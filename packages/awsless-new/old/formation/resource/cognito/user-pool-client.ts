import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'
import { Duration } from '../../property/duration.js'

export type UserPoolClientProps = {
	name?: string
	userPoolId: string
	enableTokenRevocation?: boolean
	generateSecret?: boolean
	preventUserExistenceErrors?: boolean
	supportedIdentityProviders?: Array<'amazon' | 'apple' | 'cognito' | 'facebook' | 'google'>

	validity?: {
		authSession?: Duration
		accessToken?: Duration
		idToken?: Duration
		refreshToken?: Duration
	}
	authFlows?: {
		adminUserPassword?: boolean
		custom?: boolean
		userPassword?: boolean
		userSrp?: boolean
	}
	readAttributes?: string[]
	writeAttributes?: string[]
}

export class UserPoolClient extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: UserPoolClientProps) {
		super('AWS::Cognito::UserPoolClient', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return this.ref()
	}

	private formatAuthFlows() {
		const authFlows: string[] = []

		if (this.props.authFlows?.userPassword) {
			authFlows.push('ALLOW_USER_PASSWORD_AUTH')
		}
		if (this.props.authFlows?.adminUserPassword) {
			authFlows.push('ALLOW_ADMIN_USER_PASSWORD_AUTH')
		}
		if (this.props.authFlows?.custom) {
			authFlows.push('ALLOW_CUSTOM_AUTH')
		}
		if (this.props.authFlows?.userSrp) {
			authFlows.push('ALLOW_USER_SRP_AUTH')
		}

		authFlows.push('ALLOW_REFRESH_TOKEN_AUTH')

		return authFlows
	}

	private formatIdentityProviders() {
		const supported = this.props.supportedIdentityProviders ?? []
		const providers: string[] = []

		if (supported.length === 0) {
			return undefined
		}

		if (supported.includes('amazon')) {
			providers.push('LoginWithAmazon')
		}
		if (supported.includes('apple')) {
			providers.push('SignInWithApple')
		}
		if (supported.includes('cognito')) {
			providers.push('COGNITO')
		}
		if (supported.includes('facebook')) {
			providers.push('Facebook')
		}
		if (supported.includes('google')) {
			providers.push('Google')
		}

		return providers
	}

	protected properties() {
		return {
			ClientName: this.name,
			UserPoolId: this.props.userPoolId,
			ExplicitAuthFlows: this.formatAuthFlows(),
			EnableTokenRevocation: this.props.enableTokenRevocation ?? false,
			GenerateSecret: this.props.generateSecret ?? false,
			PreventUserExistenceErrors: this.props.preventUserExistenceErrors ?? true ? 'ENABLED' : 'LEGACY',

			...this.attr('SupportedIdentityProviders', this.formatIdentityProviders()),

			AllowedOAuthFlows: ['code'],
			AllowedOAuthScopes: ['openid'],
			AllowedOAuthFlowsUserPoolClient: true,
			CallbackURLs: ['https://example.com'],
			LogoutURLs: ['https://example.com'],

			// DefaultRedirectURI: String
			// EnablePropagateAdditionalUserContextData

			...this.attr('ReadAttributes', this.props.readAttributes),
			...this.attr('WriteAttributes', this.props.writeAttributes),

			...this.attr('AuthSessionValidity', this.props.validity?.authSession?.toMinutes()),
			...this.attr('AccessTokenValidity', this.props.validity?.accessToken?.toHours()),
			...this.attr('IdTokenValidity', this.props.validity?.idToken?.toHours()),
			...this.attr('RefreshTokenValidity', this.props.validity?.refreshToken?.toDays()),

			TokenValidityUnits: {
				...this.attr('AccessToken', this.props.validity?.accessToken && 'hours'),
				...this.attr('IdToken', this.props.validity?.idToken && 'hours'),
				...this.attr('RefreshToken', this.props.validity?.refreshToken && 'days'),
			},
		}
	}
}
