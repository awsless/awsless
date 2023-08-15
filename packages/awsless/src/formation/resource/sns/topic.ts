import { Resource } from "../../resource";
import { formatName, ref } from "../../util";

export type TopicProps = {
	name?: string
}

export class Topic extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: TopicProps = {}) {
		super('AWS::SNS::Topic', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return ref(this.logicalId)
	}

	get permissions() {
		return {
			actions: [ 'sns:Publish' ],
			resources: [ this.arn ],
		}
	}

	properties() {
		return {
			TopicName: this.name,
			DisplayName: this.name,
		}
	}
}
