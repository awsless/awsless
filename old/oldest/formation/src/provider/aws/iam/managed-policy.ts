export const fromAwsManagedPolicyName = (name: string) => {
	return `arn:aws:iam::aws:policy/service-role/${name}` as const
}

// export class ManagedPolicy {
// 	static fromAwsManagedPolicyName(name: string) {
// 		return new ManagedPolicy(`arn:aws:iam::aws:policy/service-role/${name}`)
// 	}

// 	static fromManagedPolicyArn(arn: ARN) {
// 		return new ManagedPolicy(arn)
// 	}

// 	constructor(readonly arn: ARN) {}
// }
