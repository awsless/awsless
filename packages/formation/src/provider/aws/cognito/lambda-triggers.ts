import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'
import { ARN } from '../types'

export type LambaTriggersProps = {
	userPoolId: Input<string>
	triggers: Input<{
		beforeToken?: Input<ARN>
		beforeLogin?: Input<ARN>
		afterLogin?: Input<ARN>
		beforeRegister?: Input<ARN>
		afterRegister?: Input<ARN>
		userMigration?: Input<ARN>
		customMessage?: Input<ARN>

		defineChallange?: Input<ARN>
		createChallange?: Input<ARN>
		verifyChallange?: Input<ARN>

		// emailSender?: Input<ARN>
		// smsSender?: Input<ARN>
	}>
}

export class LambdaTriggers extends Resource {
	cloudProviderId = 'aws-cognito-lambda-triggers'

	constructor(id: string, private props: LambaTriggersProps) {
		super('AWS::Cognito::UserPoolLambdaConfig', id, props)
	}

	toState() {
		const triggers = unwrap(this.props.triggers)

		return {
			document: {
				UserPoolId: this.props.userPoolId,
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

					// ...(triggers?.emailSender
					// 	? {
					// 			CustomEmailSender: {
					// 				LambdaArn: triggers.emailSender,
					// 				LambdaVersion: 'V1_0',
					// 			},
					// 	  }
					// 	: {}),

					// ...(triggers?.smsSender
					// 	? {
					// 			CustomSMSSender: {
					// 				LambdaArn: triggers.smsSender,
					// 				LambdaVersion: 'V1_0',
					// 			},
					// 	  }
					// 	: {}),
				},
			},
		}
	}
}
