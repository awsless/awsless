import { Resource } from "../../resource"
import { formatName, getAtt } from "../../util"
import { InlinePolicy } from "./inline-policy"
import { ManagedPolicy } from "./managed-policy"

export class Role extends Resource {
	readonly name: string

	private inlinePolicies = new Set<InlinePolicy>()
	private managedPolicies = new Set<ManagedPolicy>()

	constructor(logicalId: string, private props: {
		assumedBy?: string
	} = {}) {
		super('AWS::IAM::Role', logicalId)
		this.name = formatName(logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	addManagedPolicy(...policies: ManagedPolicy[]) {
		for(const policy of policies) {
			this.managedPolicies.add(policy)
		}

		return this
	}

	addInlinePolicy(...policies: InlinePolicy[]) {
		for(const policy of policies) {
			this.inlinePolicies.add(policy)
		}

		return this
	}

	properties() {
		return {
			...( this.props.assumedBy ? {
				AssumeRolePolicyDocument: {
					Version: '2012-10-17',
					Statement: [{
						Action: 'sts:AssumeRole',
						Effect: 'Allow',
						Principal: {
							Service: this.props.assumedBy
						}
					}],
				},
			} : {}),
			ManagedPolicyArns: [ ...this.managedPolicies ].map(policy => policy.arn),
			Policies: [ ...this.inlinePolicies ].map(policy => policy.toJSON())
		}
	}
}
