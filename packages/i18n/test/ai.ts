import { MockLanguageModelV4 } from 'ai/test'
import { ai, matchTranslations } from '../src/translate/ai'

const respond = (translations: unknown) => ({
	content: [{ type: 'text' as const, text: JSON.stringify({ translations }) }],
	finishReason: { unified: 'stop' as const, raw: undefined },
	usage: {
		inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
		outputTokens: { total: 1, text: 1, reasoning: undefined },
	},
	warnings: [],
})

describe('ai translator', () => {
	it('sends the context along & matches the answers back by id', async () => {
		const model = new MockLanguageModelV4({
			doGenerate: async () =>
				respond([
					{ id: 1, translation: 'Enregistrer' },
					{ id: 0, translation: 'Sauvegarder' },
					{ id: 7, translation: 'ignored, no such request' },
				]),
		})

		const translate = ai({ model, maxOutputTokens: 100 })
		const result = await translate('en', [
			{ source: 'Save', locale: 'fr' },
			{ source: 'Save', locale: 'fr', context: 'button label' },
		])

		expect(result).toStrictEqual([
			{ source: 'Save', locale: 'fr', context: 'button label', translation: 'Enregistrer' },
			{ source: 'Save', locale: 'fr', translation: 'Sauvegarder' },
		])

		const prompt = JSON.stringify(model.doGenerateCalls[0]!.prompt)
		expect(prompt).toContain('{\\"id\\":0,\\"source\\":\\"Save\\",\\"locale\\":\\"fr\\"}')
		expect(prompt).toContain(
			'{\\"id\\":1,\\"source\\":\\"Save\\",\\"locale\\":\\"fr\\",\\"context\\":\\"button label\\"}'
		)
		expect(prompt).toContain('Never translate, add, remove, or rename a tag or placeholder.')
	})

	it('numbers every batch from zero', async () => {
		const model = new MockLanguageModelV4({
			doGenerate: async () => respond([{ id: 0, translation: 'x' }]),
		})

		const translate = ai({ model, maxOutputTokens: 100, batchSize: 1 })
		const result = await translate('en', [
			{ source: 'a', locale: 'fr' },
			{ source: 'b', locale: 'fr' },
		])

		expect(model.doGenerateCalls).toHaveLength(2)
		expect(result).toStrictEqual([
			{ source: 'a', locale: 'fr', translation: 'x' },
			{ source: 'b', locale: 'fr', translation: 'x' },
		])
	})

	it('drops answers for unknown ids', () => {
		expect(matchTranslations([{ source: 'a', locale: 'fr' }], [{ id: 3, translation: 'x' }])).toStrictEqual([])
	})
})
