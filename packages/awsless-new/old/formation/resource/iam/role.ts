import { Resource } from '../../resource.js'
import { InlinePolicy } from './inline-policy.js'
import { ManagedPolicy } from './managed-policy.js'

export class Role extends Resource {
	private inlinePolicies = new Set<InlinePolicy>()
	private managedPolicies = new Set<ManagedPolicy>()

	constructor(
		logicalId: string,
		private props: {
			assumedBy?: string
		} = {}
	) {
		super('AWS::IAM::Role', logicalId)
	}

	get arn() {
		return this.getAtt('Arn')
	}

	addManagedPolicy(...policies: ManagedPolicy[]) {
		for (const policy of policies) {
			this.managedPolicies.add(policy)
		}

		return this
	}

	addInlinePolicy(...policies: InlinePolicy[]) {
		for (const policy of policies) {
			this.inlinePolicies.add(policy)
		}

		return this
	}

	protected properties() {
		return {
			...(this.props.assumedBy
				? {
						AssumeRolePolicyDocument: {
							Version: '2012-10-17',
							Statement: [
								{
									Action: 'sts:AssumeRole',
									Effect: 'Allow',
									Principal: {
										Service: this.props.assumedBy,
									},
								},
							],
						},
				  }
				: {}),
			ManagedPolicyArns: [...this.managedPolicies].map(policy => policy.arn),
			Policies: [...this.inlinePolicies].map(policy => policy.toJSON()),
		}
	}
}
