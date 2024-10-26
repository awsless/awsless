export default async (event: { left: number; right: number }) => {
	return {
		result: event.left + event.right,
	}
}
