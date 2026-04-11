import { Duration, toDays } from '@awsless/duration'
import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type LifecycleRule = {
	description?: string
	tagStatus: 'tagged' | 'untagged' | 'any'
	tagPatternList?: string[]
} & (
	| {
			maxImageAge: Duration
	  }
	| {
			maxImageCount: number
	  }
)

export type RepositoryProps = {
	name: Input<string>
	emptyOnDelete?: Input<boolean>
	imageTagMutability?: Input<boolean>
	// lifecycleRules?: LifecycleRule[]
}

export class Repository extends CloudControlApiResource {
	private lifecycleRules: LifecycleRule[] = []

	constructor(
		readonly parent: Node,
		id: string,
		private props: RepositoryProps
	) {
		super(parent, 'AWS::ECR::Repository', id, props)
	}

	get name() {
		return this.output<string>(v => v.RepositoryName)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get uri() {
		return this.output<string>(v => v.RepositoryUri)
	}

	addLifecycleRule(rule: LifecycleRule) {
		this.lifecycleRules.push(rule)
	}

	private formatLifecycleRules() {
		return JSON.stringify({
			rules: this.lifecycleRules.map((rule, index) => ({
				rulePriority: index + 1,
				description: rule.description,
				selection: {
					tagStatus: rule.tagStatus,
					tagPatternList: rule.tagPatternList,

					...('maxImageCount' in rule
						? {
								countType: 'imageCountMoreThan',
								countNumber: rule.maxImageCount,
							}
						: {
								countType: 'sinceImagePushed',
								countNumber: Number(toDays(rule.maxImageAge)),
								countUnit: 'days',
							}),
				},
				action: {
					type: 'expire',
				},
			})),
		})
	}

	toState() {
		return {
			document: {
				RepositoryName: this.props.name,
				EmptyOnDelete: this.props.emptyOnDelete,
				ImageTagMutability: this.props.imageTagMutability ? 'MUTABLE' : 'IMMUTABLE',
				LifecyclePolicy: {
					LifecyclePolicyText: this.lifecycleRules.length > 0 ? this.formatLifecycleRules() : undefined,
				},
			},
		}
	}
}
