import { sub } from '../../util.js'

export class ManagedPolicy {

	static fromAwsManagedPolicyName(name:string) {
		const arn = sub('arn:${AWS::Partition}:iam::aws:policy/service-role/' + name)
		return new ManagedPolicy(arn)
	}

	static fromManagedPolicyArn(arn:string) {
		return new ManagedPolicy(arn)
	}

	constructor(readonly arn:string) {}
}
