import { buildTree, parseSource, tokenizeTranslation, validateTranslation } from '../src/tree'

const source = 'Hello <b>{user.name}</b>, you have <Link>{count} new messages</Link>.'

describe('tree', () => {
	it('parses a source into text and nodes', () => {
		const { tokens, nodes } = parseSource(source)

		expect(nodes.map(node => [node.id, node.label, node.kind, node.leaf])).toStrictEqual([
			[0, 'b', 'element', false],
			[1, 'user.name', 'expression', true],
			[2, 'Link', 'element', false],
			[3, 'count', 'expression', true],
		])

		expect(buildTree(tokens, nodes).tree).toStrictEqual([
			'Hello ',
			[0, [[1]]],
			', you have ',
			[2, [[3], ' new messages']],
			'.',
		])
	})

	it('lets a translation move tags and placeholders around', () => {
		const { nodes } = parseSource(source)
		const tokens = tokenizeTranslation(
			'<b>{user.name}</b>さん、<Link>新着メッセージが{count}件</Link>あります。',
			nodes
		)

		expect(buildTree(tokens, nodes).tree).toStrictEqual([
			[0, [[1]]],
			'さん、',
			[2, ['新着メッセージが', [3], '件']],
			'あります。',
		])
	})

	it('accepts the common spellings of a self closing tag', () => {
		const { nodes } = parseSource('line<br/>break <Icon/>')

		for (const translation of ['ligne<br/>saut <Icon />', 'ligne<br>saut <Icon>']) {
			expect(buildTree(tokenizeTranslation(translation, nodes), nodes).tree).toStrictEqual([
				'ligne',
				[0],
				'saut ',
				[1],
			])
		}
	})

	it('hands out identical placeholders in order', () => {
		const { nodes } = parseSource('{count} of {count}')
		const tokens = tokenizeTranslation('{count} sur {count}', nodes)

		expect(tokens).toStrictEqual([
			{ kind: 'leaf', id: 0 },
			{ kind: 'text', text: ' sur ' },
			{ kind: 'leaf', id: 1 },
		])
	})

	it('tells the longer tag name apart from the shorter one', () => {
		const { nodes } = parseSource('<b_1>a</b_1> <b_2>b</b_2>')
		const tokens = tokenizeTranslation('<b_2>b</b_2> <b_1>a</b_1>', nodes)

		expect(buildTree(tokens, nodes).tree).toStrictEqual([[1, ['b']], ' ', [0, ['a']]])
	})

	it('reports a translation that breaks the structure', () => {
		expect(validateTranslation(source, 'Bonjour <b>{user.name}</b>, vous avez {count} messages.')).toBe(
			'<Link> is missing'
		)
		expect(validateTranslation(source, 'Bonjour <b>{user.nom}</b>, vous avez <Link>{count}</Link>.')).toBe(
			'{user.name} is missing'
		)
		expect(validateTranslation(source, 'Bonjour <b>{user.name}, vous avez <Link>{count}</Link>.')).toBe(
			'missing closing tag for <b>'
		)
		expect(validateTranslation(source, 'Bonjour <b>{user.name}</b></b> <Link>{count}</Link>.')).toBe(
			'unexpected closing tag for <b>'
		)
		expect(validateTranslation(source, '{count} <b>{user.name}</b> <Link>{count}</Link>.')).toBe(
			'{count} is used more than once'
		)
	})

	it('validates template string placeholders too', () => {
		expect(validateTranslation('the count is ${num}', 'le compte est de ${num}')).toBeUndefined()
		expect(validateTranslation('the count is ${num}', 'le compte est de')).toBe('${num} is missing')
	})

	it('leaves plain text alone', () => {
		expect(validateTranslation('a < b and { c', 'anything')).toBeUndefined()
	})
})
