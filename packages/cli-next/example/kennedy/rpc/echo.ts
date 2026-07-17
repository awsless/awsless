import { getStack } from 'awsless'

export default async (event: { message?: string }) => {
	return {
		echo: event.message,
		stack: getStack(),
	}
}
