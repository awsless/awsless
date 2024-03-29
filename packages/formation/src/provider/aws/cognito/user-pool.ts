import { constantCase } from 'change-case'
import { UserPoolClient, UserPoolClientProps } from './user-pool-client.js'
// import { UserPoolDomain, UserPoolDomainProps } from './user-pool-domain.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Duration, days, toDays } from '@awsless/duration'
import { Input, unwrap } from '../../../resource/output.js'
import { ARN } from '../types.js'

export type UserPoolProps = {
	name: Input<string>
	deletionProtection?: Input<boolean>
	allowUserRegistration?: Input<boolean>
	email?: Input<UserPoolEmail>
	username?: Input<{
		emailAlias?: Input<boolean>
		caseSensitive?: Input<boolean>
	}>
	password?: Input<{
		minLength?: Input<number>
		uppercase?: Input<boolean>
		lowercase?: Input<boolean>
		numbers?: Input<boolean>
		symbols?: Input<boolean>
		temporaryPasswordValidity?: Input<Duration>
	}>
	triggers?: Input<{
		beforeToken?: Input<ARN>
		beforeLogin?: Input<ARN>
		afterLogin?: Input<ARN>
		beforeRegister?: Input<ARN>
		afterRegister?: Input<ARN>
		customMessage?: Input<ARN>
		userMigration?: Input<ARN>

		emailSender?: Input<ARN>

		defineChallange?: Input<ARN>
		createChallange?: Input<ARN>
		verifyChallange?: Input<ARN>
	}>
}

export class UserPool extends CloudControlApiResource {
	constructor(id: string, private props: UserPoolProps) {
		super('AWS::Cognito::UserPool', id, props)
	}

	get id() {
		return this.output<string>(v => v.UserPoolId)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get providerName() {
		return this.output<string>(v => v.ProviderName)
	}

	get providerUrl() {
		return this.output<string>(v => v.ProviderURL)
	}

	// addDomain(props: Omit<UserPoolDomainProps, 'userPoolId'>) {
	// 	const domain = new UserPoolDomain(this.logicalId, {
	// 		...props,
	// 		userPoolId: this.id,
	// 	}).dependsOn(this)

	// 	this.addChild(domain)

	// 	return domain
	// }

	addClient(id: string, props: Omit<UserPoolClientProps, 'userPoolId'>) {
		const client = new UserPoolClient(id, {
			...props,
			userPoolId: this.id,
		})

		this.add(client)

		return client
	}

	toState() {
		const username = unwrap(this.props.username)
		const password = unwrap(this.props.password)
		const triggers = unwrap(this.props.triggers)

		return {
			document: {
				UserPoolName: this.props.name,
				DeletionProtection: unwrap(this.props.deletionProtection) ? 'ACTIVE' : 'INACTIVE',

				// UserPoolTags: [],
				...(unwrap(username?.emailAlias)
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
					CaseSensitive: unwrap(username?.caseSensitive, false),
				},

				...this.attr('EmailConfiguration', unwrap(this.props.email)?.toJSON()),

				DeviceConfiguration: {
					DeviceOnlyRememberedOnUserPrompt: false,
				},

				AdminCreateUserConfig: {
					AllowAdminCreateUserOnly: !unwrap(this.props.allowUserRegistration, true),
				},
				Policies: {
					PasswordPolicy: {
						MinimumLength: unwrap(password?.minLength, 8),
						RequireUppercase: unwrap(password?.uppercase, false),
						RequireLowercase: unwrap(password?.lowercase, false),
						RequireNumbers: unwrap(password?.numbers, false),
						RequireSymbols: unwrap(password?.symbols, false),
						TemporaryPasswordValidityDays: toDays(
							unwrap(password?.temporaryPasswordValidity, days(7))
						),
					},
				},
				LambdaConfig: {
					...this.attr('PreAuthentication', triggers?.beforeLogin),
					...this.attr('PostAuthentication', triggers?.afterLogin),
					...this.attr('PostConfirmation', triggers?.afterRegister),
					...this.attr('PreSignUp', triggers?.beforeRegister),
					...this.attr('PreTokenGeneration', triggers?.beforeToken),
					...this.attr('CustomMessage', triggers?.customMessage),
					...this.attr('UserMigration', triggers?.userMigration),

					...this.attr('DefineAuthChallenge', triggers?.defineChallange),
					...this.attr('CreateAuthChallenge', triggers?.createChallange),
					...this.attr('VerifyAuthChallengeResponse', triggers?.verifyChallange),

					...(triggers?.emailSender
						? {
								CustomEmailSender: {
									LambdaArn: triggers.emailSender,
									LambdaVersion: 'V1_0',
								},
						  }
						: {}),
				},
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
