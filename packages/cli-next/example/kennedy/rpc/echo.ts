import { getStack, PubSub } from 'awsless'

export default async (event: { message?: string }) => {
	await PubSub.test.publish('news', 'echo', { message: event.message })

	return {
		echo: event.message,
		stack: getStack(),
	}
}
