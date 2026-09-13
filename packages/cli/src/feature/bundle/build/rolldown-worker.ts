import { ExpectedError } from '../../../error.js'
import { setRoot } from '../../../util/path.js'
import { bundleTypeScriptInProcess, BundleTypeScriptProps } from './rolldown.js'

// Rolldown retains memory of every build it runs in a process, so the
// dev server runs each build in this short-lived child instead - the
// leak dies with the process. Props come in over stdin, the result
// leaves as one json line over stdout.

const chunks: Buffer[] = []

process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk))

process.stdin.on('end', async () => {
	let output

	try {
		const { root, props } = JSON.parse(Buffer.concat(chunks).toString()) as {
			root: string
			props: BundleTypeScriptProps
		}

		// The treeshake side-effect rules resolve against the app root.
		setRoot(root)

		const result = await bundleTypeScriptInProcess(props)

		output = JSON.stringify({
			ok: true,
			hash: result.hash,
			files: result.files.map(file => ({
				name: file.name,
				code: file.code.toString('base64'),
				map: file.map?.toString('base64'),
			})),
		})
	} catch (error) {
		output = JSON.stringify({
			ok: false,
			expected: error instanceof ExpectedError,
			message: error instanceof Error ? error.message : String(error),
		})
	}

	// Exit only once the pipe flushed - rolldown's native threads would
	// otherwise keep the process alive forever.
	process.stdout.write(output, () => process.exit(0))
})
