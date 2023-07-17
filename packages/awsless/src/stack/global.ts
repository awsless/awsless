import { App, Stack } from "aws-cdk-lib";
import { Config } from "../config";
import { Topic } from "aws-cdk-lib/aws-sns";
import { toId } from "../util/resource";

export const findAllTopicIds = (config:Config) => {
	return [...new Set(config.stacks.map(
		stack => Object.keys(stack.topics || {})
	).flat())]
}

export const globalStack = (config:Config, app:App) => {
	const stack = new Stack(app, 'global', {
		stackName: `${config.name}-global`
	})

	findAllTopicIds(config).map(id => {
		new Topic(stack, toId('topic', id), {
			topicName: id,
			displayName: id,
		})
	})

	return stack
}
