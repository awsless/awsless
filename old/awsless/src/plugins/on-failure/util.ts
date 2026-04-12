import { Config } from '../../config/config.js'
import { Stack } from '../../formation/stack.js'

export const getGlobalOnFailure = ({ config, bootstrap }: { config: Config; bootstrap: Stack }) => {
	return hasOnFailure(config) ? bootstrap.import('on-failure-queue-arn') : undefined
}

export const hasOnFailure = (config: Config) => {
	const onFailure = config.stacks.find(stack => {
		// @ts-ignore
		return typeof stack.onFailure !== 'undefined'
	})

	return !!onFailure
}
