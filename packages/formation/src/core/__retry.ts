import { sleep } from './hash'

type ErrorConstructor = new (...args: any[]) => Error

export const retry = async <T>(
	retryableErrors: ErrorConstructor[],
	retries: number,
	cb: () => Promise<T>
): Promise<T> => {
	let retry = 0
	while (true) {
		try {
			const result = await cb()
			return result
		} catch (error) {
			console.error('Retry', error)

			const isRetryable = retryableErrors.find(Retryable => {
				return error instanceof Retryable
			})

			if (!isRetryable || retry++ < retries) {
				throw error
			}

			const jitter = Math.floor(Math.random() * 100)

			await sleep(100 * retry + jitter)
		}
	}
}

// while (retry < retries) {
//     try {
//         makeError = null
//         sh "make ${targets.join(' ')}"
//         break
//     } catch (Exception ex) {
//         fileOperations([fileCopyOperation(excludes: '', flattenFiles: false, includes: '**log',
//                 renameFiles: false, sourceCaptureExpression: '',
//                 targetLocation: outputDir, targetNameExpression: '')])
//         makeError = ex
//         errorHandling.addResult('runMake', "path: ${path}, targets: ${targets}, retry: ${retry} of ${retries} failed with ${makeError}.  retrying")
//         sleep time: waitSecs, unit: 'SECONDS'
//     } finally {
//         retry++
//     }
// }
