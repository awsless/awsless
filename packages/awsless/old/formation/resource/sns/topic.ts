import { Resource } from "../../resource";
import { Stack } from "../../stack";
import { formatName, ref } from "../../util";

export type TopicProps = {
	name?: string
}

export class Topic extends Resource {
	readonly name: string

	constructor(readonly logicalId: string, private props: TopicProps = {}) {
		super('sns', 'topic', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return ref(`${ this.logicalId }Topic`)
	}

	template(stack:Stack) {
		return {
			[ `${ this.logicalId }Topic` ]: {
				Type: 'AWS::SNS::Topic',
				Properties: {
					TopicName: stack.formatResourceName(this.name),
					DisplayName: this.name,
				}
			}
		}
	}
}
