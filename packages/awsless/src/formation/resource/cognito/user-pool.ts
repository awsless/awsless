import { constantCase } from "change-case";
import { Resource } from '../../resource.js';
import { formatArn, formatName, getAtt, ref } from '../../util.js';
import { Duration } from "../../property/duration.js";
import { UserPoolClient, UserPoolClientProps } from "./user-pool-client.js";
import { UserPoolDomain, UserPoolDomainProps } from "./user-pool-domain.js";

// export type IndexProps = {
// 	hash: string
// 	sort?: string
// 	projection?: 'all' | 'keys-only'
// }

// export type StreamViewType = 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images'

export type UserPoolProps = {
	name?: string
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
	events?: {
		preToken?: string
		preLogin?: string
		postLogin?: string
		preRegister?: string
		postRegister?: string
		customMessage?: string
		userMigration?: string

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
		return ref(this.logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	get providerName() {
		return getAtt(this.logicalId, 'ProviderName')
	}

	get providerUrl() {
		return getAtt(this.logicalId, 'ProviderURL')
	}

	addDomain(props:Omit<UserPoolDomainProps, 'userPoolId'>) {
		const domain = new UserPoolDomain(this.logicalId, {
			...props,
			userPoolId: this.id
		}).dependsOn(this)

		this.addChild(domain)

		return domain
	}

	addClient(props:Omit<UserPoolClientProps, 'userPoolId'> = {}) {
		const client = new UserPoolClient(this.logicalId, {
			...props,
			userPoolId: this.id
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

	properties() {
		return {
			UserPoolName: this.name,
			// UserPoolTags: [],
			...(this.props.username?.emailAlias ? {
				AliasAttributes: [ 'email' ],
				// UsernameAttributes: [ 'email' ],
				AutoVerifiedAttributes: [ 'email' ],

				Schema: [{
					AttributeDataType: 'String',
					Name: 'email',
					Required: true,
					Mutable: false,
					StringAttributeConstraints: {
						MinLength: 5,
						MaxLength: 100,
					}
				}],
			} : {}),

			UsernameConfiguration: {
				CaseSensitive: this.props.username?.caseSensitive ?? false,
			},

			...this.attr('EmailConfiguration', this.props.email?.toJSON()),

			// DeviceConfiguration: {
			// 	ChallengeRequiredOnNewDevice: {},
			// 	DeviceOnlyRememberedOnUserPrompt: {},
			// },

			AdminCreateUserConfig: {
				AllowAdminCreateUserOnly: !( this.props.allowUserRegistration ?? true ),
			},
			Policies: {
				PasswordPolicy: {
					MinimumLength: this.props.password?.minLength ?? 8,
					RequireUppercase: this.props.password?.uppercase ?? false,
					RequireLowercase: this.props.password?.lowercase ?? false,
					RequireNumbers: this.props.password?.numbers ?? false,
					RequireSymbols: this.props.password?.symbols ?? false,
					TemporaryPasswordValidityDays: this.props.password?.temporaryPasswordValidity?.toDays() ?? 7,
				}
			},
			LambdaConfig: {
				...this.attr('PreAuthentication', this.props.events?.preLogin),
				...this.attr('PostAuthentication', this.props.events?.postLogin),
				...this.attr('PostConfirmation', this.props.events?.postRegister),
				...this.attr('PreSignUp', this.props.events?.preRegister),
				...this.attr('PreTokenGeneration', this.props.events?.preToken),
				...this.attr('CustomMessage', this.props.events?.customMessage),
				...this.attr('UserMigration', this.props.events?.userMigration),

				...this.attr('DefineAuthChallenge', this.props.events?.defineChallange),
				...this.attr('CreateAuthChallenge', this.props.events?.createChallange),
				...this.attr('VerifyAuthChallengeResponse', this.props.events?.verifyChallange),
			}
		}
	}
}

export class UserPoolEmail {
	static withSES(props:{
		fromEmail: string
		fromName?: string
		replyTo?: string
	}) {
		return new UserPoolEmail({
			type: 'developer',
			replyTo: props.replyTo,
			from: props.fromName
				? `${props.fromName} <${props.fromEmail}>`
				: props.fromEmail,

			sourceArn: formatArn({
				service: 'ses',
				resource: 'identity',
				resourceName: props.fromEmail
			})
		})
	}

	constructor(private props:{
		type?: 'developer' | 'cognito-default'
		from?: string
		replyTo?: string
		sourceArn?: string
	}) {}

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
