import { Input } from '../../core/output'
import { ARN } from './types'

export const formatTags = (tags: Record<string, Input<string>>) => {
	return Object.entries(tags).map(([Key, Value]) => ({
		Key,
		Value,
	}))
}

export const formatArn = (props: {
	partition?: string
	service: string
	region: string
	accountId: string
	resource?: string
	resourceName?: string
	seperator?: string
}) => {
	const staticPart = [`arn`, props.partition ?? 'aws', props.service, props.region, props.accountId]

	if (props.resource && props.resourceName) {
		staticPart.push([props.resource, props.resourceName].join(props.seperator ?? '/'))
	} else if (props.resource) {
		staticPart.push(props.resource)
	}

	return staticPart.join(':') as ARN
}
