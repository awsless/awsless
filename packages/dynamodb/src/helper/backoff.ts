// Exponential backoff with jitter, for retrying batch operations that
// returned unprocessed items.
export const backoff = (attempt: number, base = 100, max = 5000) => {
	const delay = Math.min(base * 2 ** attempt, max)
	const time = delay / 2 + Math.random() * (delay / 2)

	return new Promise(resolve => setTimeout(resolve, time))
}
