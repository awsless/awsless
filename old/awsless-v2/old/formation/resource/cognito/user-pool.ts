import { constantCase } from 'change-case'
import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'
import { Duration } from '../../property/duration.js'
import { UserPoolClient, UserPoolClientProps } from './user-pool-client.js'
import { UserPoolDomain, UserPoolDomainProps } from './user-pool-domain.js'

// export type IndexProps = {
// 	hash: string
// 	sort?: string
// 	projection?: 'all' | 'keys-only'
// }

// export type StreamViewType = 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images'

export type UserPoolProps = {
	name?: string
	deletionProtection?: boolean
	allowUserRegistration?: boolean
	email?: UserPoolEmail
	username?: {
		emailAlias?: boolean
		caseSensitive?: boolean
	}
	password?: {
		minLength?: number
		uppercase?: boolean
		lowercase?: boolean
		numbers?: boolean
		symbols?: boolean
		temporaryPasswordValidity?: Duration
	}
	triggers?: {
		beforeToken?: string
		beforeLogin?: string
		afterLogin?: string
		beforeRegister?: string
		afterRegister?: string
		customMessage?: string
		userMigration?: string

		emailSender?: string

		defineChallange?: string
		createChallange?: string
		verifyChallange?: string
	}
}

export class UserPool extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: UserPoolProps) {
		super('AWS::Cognito::UserPool', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return this.ref()
	}

	get arn() {
		return this.getAtt('Arn')
	}

	get providerName() {
		return this.getAtt('ProviderName')
	}

	get providerUrl() {
		return this.getAtt('ProviderURL')
	}

	addDomain(props: Omit<UserPoolDomainProps, 'userPoolId'>) {
		const domain = new UserPoolDomain(this.logicalId, {
			...props,
			userPoolId: this.id,
		}).dependsOn(this)

		this.addChild(domain)

		return domain
	}

	addClient(props: Omit<UserPoolClientProps, 'userPoolId'> = {}) {
		const client = new UserPoolClient(this.logicalId, {
			...props,
			userPoolId: this.id,
		}).dependsOn(this)

		this.addChild(client)

		return client
	}

	// get permissions() {
	// 	const permissions = [{
	// 		actions: [
	// 			'dynamodb:DescribeTable',
	// 			'dynamodb:PutItem',
	// 			'dynamodb:GetItem',
	// 			'dynamodb:DeleteItem',
	// 			'dynamodb:TransactWrite',
	// 			'dynamodb:BatchWriteItem',
	// 			'dynamodb:BatchGetItem',
	// 			'dynamodb:ConditionCheckItem',
	// 			'dynamodb:Query',
	// 			'dynamodb:Scan',
	// 		],
	// 		resources: [
	// 			formatArn({
	// 				service: 'dynamodb',
	// 				resource: 'table',
	// 				resourceName: this.name,
	// 			}),
	// 		 ],
	// 	}]
	// }

	protected properties() {
		return {
			UserPoolName: this.name,

			DeletionProtection: this.props.deletionProtection ? 'ACTIVE' : 'INACTIVE',

			// UserPoolTags: [],
			...(this.props.username?.emailAlias
				? {
						AliasAttributes: ['email'],
						// UsernameAttributes: [ 'email' ],
						AutoVerifiedAttributes: ['email'],

						Schema: [
							{
								AttributeDataType: 'String',
								Name: 'email',
								Required: true,
								Mutable: false,
								StringAttributeConstraints: {
									MinLength: 5,
									MaxLength: 100,
								},
							},
						],
				  }
				: {}),

			UsernameConfiguration: {
				CaseSensitive: this.props.username?.caseSensitive ?? false,
			},

			...this.attr('EmailConfiguration', this.props.email?.toJSON()),

			DeviceConfiguration: {
				DeviceOnlyRememberedOnUserPrompt: false,
			},

			AdminCreateUserConfig: {
				AllowAdminCreateUserOnly: !(this.props.allowUserRegistration ?? true),
			},
			Policies: {
				PasswordPolicy: {
					MinimumLength: this.props.password?.minLength ?? 8,
					RequireUppercase: this.props.password?.uppercase ?? false,
					RequireLowercase: this.props.password?.lowercase ?? false,
					RequireNumbers: this.props.password?.numbers ?? false,
					RequireSymbols: this.props.password?.symbols ?? false,
					TemporaryPasswordValidityDays: this.props.password?.temporaryPasswordValidity?.toDays() ?? 7,
				},
			},
			LambdaConfig: {
				...this.attr('PreAuthentication', this.props.triggers?.beforeLogin),
				...this.attr('PostAuthentication', this.props.triggers?.afterLogin),
				...this.attr('PostConfirmation', this.props.triggers?.afterRegister),
				...this.attr('PreSignUp', this.props.triggers?.beforeRegister),
				...this.attr('PreTokenGeneration', this.props.triggers?.beforeToken),
				...this.attr('CustomMessage', this.props.triggers?.customMessage),
				...this.attr('UserMigration', this.props.triggers?.userMigration),

				...this.attr('DefineAuthChallenge', this.props.triggers?.defineChallange),
				...this.attr('CreateAuthChallenge', this.props.triggers?.createChallange),
				...this.attr('VerifyAuthChallengeResponse', this.props.triggers?.verifyChallange),

				...(this.props.triggers?.emailSender
					? {
							CustomEmailSender: {
								LambdaArn: this.props.triggers.emailSender,
								LambdaVersion: 'V1_0',
							},
					  }
					: {}),
			},
		}
	}
}

export class UserPoolEmail {
	static withSES(props: { fromEmail: string; fromName?: string; replyTo?: string; sourceArn: string }) {
		return new UserPoolEmail({
			type: 'developer',
			replyTo: props.replyTo,
			from: props.fromName ? `${props.fromName} <${props.fromEmail}>` : props.fromEmail,
			sourceArn: props.sourceArn,
		})
	}

	constructor(
		private props: {
			type?: 'developer' | 'cognito-default'
			from?: string
			replyTo?: string
			sourceArn?: string
		}
	) {}

	toJSON() {
		return {
			...(this.props.type ? { EmailSendingAccount: constantCase(this.props.type) } : {}),
			...(this.props.from ? { From: this.props.from } : {}),
			...(this.props.replyTo ? { ReplyToEmailAddress: this.props.replyTo } : {}),
			...(this.props.sourceArn ? { SourceArn: this.props.sourceArn } : {}),
		}
	}
}

// AccountRecoverySetting:
// AccountRecoverySetting
// AdminCreateUserConfig:
// AdminCreateUserConfig
// AliasAttributes:
// - String
// AutoVerifiedAttributes:
// - String
// DeletionProtection: String
// DeviceConfiguration:
// DeviceConfiguration
// EmailConfiguration:
// EmailConfiguration
// EmailVerificationMessage: String
// EmailVerificationSubject: String
// EnabledMfas:
// - String
// LambdaConfig:
// LambdaConfig
// MfaConfiguration: String
// Policies:
// Policies
// Schema:
// - SchemaAttribute
// SmsAuthenticationMessage: String
// SmsConfiguration:
// SmsConfiguration
// SmsVerificationMessage: String
// UserAttributeUpdateSettings:
// UserAttributeUpdateSettings
// UsernameAttributes:
// - String
// UsernameConfiguration:
// UsernameConfiguration
// UserPoolAddOns:
// UserPoolAddOns
// UserPoolName: String
// UserPoolTags: Json
// VerificationMessageTemplate:
// VerificationMessageTemplate
