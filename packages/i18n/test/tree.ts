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

describe('tree edge cases', () => {
	it('keeps comparison operators inside a placeholder', () => {
		const { tokens, nodes } = parseSource('{a < b} or {c > d}')

		expect(nodes.map(node => node.label)).toStrictEqual(['a < b', 'c > d'])
		expect(buildTree(tokenizeTranslation('{c > d} ou {a < b}', nodes), nodes).tree).toStrictEqual([
			[1],
			' ou ',
			[0],
		])
		expect(buildTree(tokens, nodes).tree).toStrictEqual([[0], ' or ', [1]])
	})

	it('handles store, html and render placeholders', () => {
		const { nodes } = parseSource('{$count} {@html raw} {@render icon()}')

		expect(nodes.map(node => `${node.prefix}${node.label}}`)).toStrictEqual([
			'{$count}',
			'{@html raw}',
			'{@render icon()}',
		])
		expect(
			buildTree(tokenizeTranslation('{@render icon()} {$count} {@html raw}', nodes), nodes).tree
		).toStrictEqual([[2], ' ', [0], ' ', [1]])
	})

	it('lets a placeholder leave its element', () => {
		const { nodes } = parseSource('<b>{n} items</b>')

		expect(buildTree(tokenizeTranslation('{n} <b>éléments</b>', nodes), nodes).tree).toStrictEqual([
			[1],
			' ',
			[0, ['éléments']],
		])
	})

	it('allows an element to end up empty', () => {
		const { nodes } = parseSource('<b>x</b>')

		expect(buildTree(tokenizeTranslation('<b></b>y', nodes), nodes).tree).toStrictEqual([[0, []], 'y'])
	})

	it('treats unknown tags and stray characters as text', () => {
		const { nodes } = parseSource('<b>x</b>')

		expect(buildTree(tokenizeTranslation('1 < 2 } <i>y</i> <b>x</b> $', nodes), nodes).tree).toStrictEqual([
			'1 < 2 } <i>y</i> ',
			[0, ['x']],
			' $',
		])
	})

	it('decodes text through the given decoder', () => {
		const { tokens, nodes } = parseSource('a &amp; <b>b</b>')

		expect(buildTree(tokens, nodes, text => text.replace('&amp;', '&')).tree).toStrictEqual(['a & ', [0, ['b']]])
	})

	it('merges adjacent text', () => {
		const { nodes } = parseSource('<b>x</b>')

		expect(
			buildTree(
				[
					{ kind: 'text', text: 'a' },
					{ kind: 'text', text: 'b' },
					{ kind: 'leaf', id: 0 },
				],
				nodes
			).tree
		).toStrictEqual(['ab', [0]])
	})

	it('rejects a translation with a swapped closing tag', () => {
		expect(validateTranslation('<b>x</b> <i>y</i>', '<b>x</i> <i>y</b>')).toBe('unexpected closing tag for <i>')
	})
})
