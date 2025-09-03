export default async (event: unknown) => {
	console.log(JSON.stringify(event))

	// const response = await fetch('https://fungamess.games/images/games/RsfBWJ9rDtiX1vsbt2p4KdiVlMlQAoTbGEtrSpR9.png')

	const response = await fetch(
		'https://fungamess.games/images/providers/D8VqScgcywEFhIOqE878BK8hRJhsXovO1wpbnBBb.svg'
	)

	if (!response.ok) {
		throw new Error(`Failed to fetch image: ${response.statusText}`)
	}
	const imageBuffer = await response.arrayBuffer()

	return Buffer.from(imageBuffer).toString('base64')
}
