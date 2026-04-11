export const padText = (texts: string[]) => {
	const size = Math.max(...texts.map(text => text.length))

	return (text: string, padding = 0) => {
		return text.padEnd(size + padding)
	}
}
