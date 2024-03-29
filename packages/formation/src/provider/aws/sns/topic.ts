import { Input } from '../../../resource/output.js'
import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'

export type TopicProps = {
	name: Input<string>
}

export class Topic extends AwsResource {
	constructor(id: string, private props: TopicProps) {
		super('AWS::SNS::Topic', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
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
				Tags: [{ Key: 'name', Value: this.props.name }],
			},
		}
	}
}
