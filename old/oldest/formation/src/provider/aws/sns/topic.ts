import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'
import { formatTags } from '../util.js'

export type TopicProps = {
	name: Input<string>
	tags?: Record<string, Input<string>>
}

export class Topic extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: TopicProps
	) {
		super(parent, 'AWS::SNS::Topic', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.TopicArn)
	}

	get name() {
		return this.output<string>(v => v.TopicName)
	}

	get permissions() {
		return {
			actions: ['sns:Publish'],
			resources: [this.arn],
		}
	}

	toState() {
		return {
			document: {
				TopicName: this.props.name,
				DisplayName: this.props.name,
				Tags: formatTags(this.tags),
			},
		}
	}
}
