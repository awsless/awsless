import { Translator } from '../vite'

export const mock = (translation = 'REPLACED'): Translator => {
	return (_, list) => {
		const response: {
			original: string
			locale: string
			translation: string
		}[] = []

		for (const item of list) {
			response.push({ ...item, translation })
		}

		return response
	}
}
