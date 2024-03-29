import { Resource } from '../../resource.js'
import { formatArn, formatName } from '../../util.js'

export type TopicProps = {
	name?: string
}

export class Topic extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: TopicProps = {}) {
		super('AWS::SNS::Topic', logicalId)

		this.name = formatName(this.props.name || logicalId)

		this.tag('name', this.name)
	}

	get arn() {
		return this.ref()
	}

	get permissions() {
		return {
			actions: ['sns:Publish'],
			resources: [
				formatArn({
					service: 'sns',
					resource: 'topic',
					resourceName: this.name,
				}),
			],
		}
	}

	protected properties() {
		return {
			TopicName: this.name,
			DisplayName: this.name,
		}
	}
}
