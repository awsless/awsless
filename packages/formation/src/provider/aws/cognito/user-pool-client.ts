import { Duration, toDays, toHours, toMinutes } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../resource/output.js'

export type UserPoolClientProps = {
	name: Input<string>
	userPoolId: Input<string>
	enableTokenRevocation?: Input<boolean>
	generateSecret?: Input<boolean>
	preventUserExistenceErrors?: Input<boolean>
	supportedIdentityProviders?: Input<Input<'amazon' | 'apple' | 'cognito' | 'facebook' | 'google'>[]>

	validity?: {
		authSession?: Input<Duration>
		accessToken?: Input<Duration>
		idToken?: Input<Duration>
		refreshToken?: Input<Duration>
	}
	authFlows?: {
		adminUserPassword?: Input<boolean>
		custom?: Input<boolean>
		userPassword?: Input<boolean>
		userSrp?: Input<boolean>
	}
	readAttributes?: Input<Input<string>[]>
	writeAttributes?: Input<Input<string>[]>
}

export class UserPoolClient extends CloudControlApiResource {
	constructor(id: string, private props: UserPoolClientProps) {
		super('AWS::Cognito::UserPoolClient', id, props)
	}

	get id() {
		return this.output<string>(v => v.ClientId)
	}

	get name() {
		return this.output<string>(v => v.ClientName)
	}

	get userPoolId() {
		return this.output<string>(v => v.UserPoolId)
	}

	private formatAuthFlows() {
		const authFlows: string[] = []
		const props = unwrap(this.props.authFlows)

		if (unwrap(props?.userPassword)) {
			authFlows.push('ALLOW_USER_PASSWORD_AUTH')
		}
		if (unwrap(props?.adminUserPassword)) {
			authFlows.push('ALLOW_ADMIN_USER_PASSWORD_AUTH')
		}
		if (unwrap(props?.custom)) {
			authFlows.push('ALLOW_CUSTOM_AUTH')
		}
		if (unwrap(props?.userSrp)) {
			authFlows.push('ALLOW_USER_SRP_AUTH')
		}

		authFlows.push('ALLOW_REFRESH_TOKEN_AUTH')

		return authFlows
	}

	private formatIdentityProviders() {
		const supported = unwrap(this.props.supportedIdentityProviders, []).map(v => unwrap(v))
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

	toState() {
		const validity = unwrap(this.props.validity, {})

		return {
			document: {
				ClientName: this.props.name,
				UserPoolId: this.props.userPoolId,
				ExplicitAuthFlows: this.formatAuthFlows(),
				EnableTokenRevocation: unwrap(this.props.enableTokenRevocation, false),
				GenerateSecret: unwrap(this.props.generateSecret, false),
				PreventUserExistenceErrors: unwrap(this.props.preventUserExistenceErrors, true)
					? 'ENABLED'
					: 'LEGACY',

				...this.attr('SupportedIdentityProviders', this.formatIdentityProviders()),

				// AllowedOAuthFlows: ['code'],
				// AllowedOAuthScopes: ['openid'],
				// AllowedOAuthFlowsUserPoolClient: true,
				// CallbackURLs: ['https://example.com'],
				// LogoutURLs: ['https://example.com'],

				// DefaultRedirectURI: String
				// EnablePropagateAdditionalUserContextData

				...this.attr('ReadAttributes', this.props.readAttributes),
				...this.attr('WriteAttributes', this.props.writeAttributes),

				...this.attr(
					'AuthSessionValidity',
					validity.authSession && toMinutes(unwrap(validity.authSession))
				),
				...this.attr('AccessTokenValidity', validity.accessToken && toHours(unwrap(validity.accessToken))),
				...this.attr('IdTokenValidity', validity.idToken && toHours(unwrap(validity.idToken))),
				...this.attr(
					'RefreshTokenValidity',
					validity.refreshToken && toDays(unwrap(validity.refreshToken))
				),

				TokenValidityUnits: {
					...this.attr('AccessToken', validity.accessToken && 'hours'),
					...this.attr('IdToken', validity.idToken && 'hours'),
					...this.attr('RefreshToken', validity.refreshToken && 'days'),
				},
			},
		}
	}
}
