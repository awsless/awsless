import MagicString from 'magic-string'

it('', () => {
	const s = new MagicString('aaa')
	s.replaceAll('a', 'b')

	console.log(
		s.generateDecodedMap({
			hires: true,
			includeContent: true,
		})
	)
})
