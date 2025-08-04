import { Translator } from '../vite'

export const mock = (translation = 'REPLACED'): Translator => {
	return (_, originals) => {
		const response: {
			source: string
			locale: string
			translation: string
		}[] = []

		for (const original of originals) {
			response.push({ ...original, translation })
		}

		return response
	}
}
