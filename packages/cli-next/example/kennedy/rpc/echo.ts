export default async (event: { message?: string }) => {
	return {
		echo: event.message,
		stack: process.env.STACK,
	}
}
