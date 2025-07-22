import { Translator } from '../vite'

export const mock = (translation = 'REPLACED'): Translator => {
	return (_, originals) => {
		const response: {
			original: string
			locale: string
			translation: string
		}[] = []

		for (const original of originals) {
			response.push({ ...original, translation })
		}

		return response
	}
}
